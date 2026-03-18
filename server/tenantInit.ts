/**
 * tenantInit.ts
 * Cria e inicializa o banco de dados de um novo tenant (empresa).
 * Suporta SQLite (padrão), PostgreSQL e MySQL via DB_TYPE no .env
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { getTenantUrl, DB_TYPE } from './masterDb.js';

const require = createRequire(import.meta.url);

// ── Utilitário: parseia DATABASE_URL para extrair host/port/user/pass/db ────────
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host:     parsed.hostname,
    port:     Number(parsed.port || 5432),
    user:     parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

// ── Utilitário: divide SQL em statements respeitando aspas e comentários ─────────
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    if (inLineComment) {
      if (char === '\n') { inLineComment = false; current += char; }
      continue;
    }
    if (!inSingleQuote && char === '-' && next === '-') {
      inLineComment = true; i++;
      continue;
    }
    if (char === "'" && !inLineComment) {
      if (sql[i - 1] !== '\\') inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (!inSingleQuote && char === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

// ── SQLite: cria arquivo .db e aplica migrations ───────────────────────────────
async function criarBancaTenantSqlite(
  cnpjLimpo: string,
  usuario: string,
  senha: string,
  nomeAdmin: string,
): Promise<string> {
  const dbFile = `${cnpjLimpo}_OS.db`;

  if (fs.existsSync(dbFile)) {
    console.log(`[tenantInit] "${dbFile}" já existe, pulando criação.`);
    return dbFile;
  }

  const migrationsRoot = path.join(process.cwd(), 'prisma', 'migrations');
  if (!fs.existsSync(migrationsRoot)) {
    throw new Error('Pasta prisma/migrations não encontrada.');
  }

  const migrationDirs = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(migrationsRoot, d.name, 'migration.sql')))
    .map(d => d.name)
    .sort();

  const db = createClient({ url: `file:./${dbFile}` });

  try {
    for (const dir of migrationDirs) {
      const sqlPath = path.join(migrationsRoot, dir, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const statements = splitSqlStatements(sql);

      if (statements.length === 0) continue;

      await db.execute('BEGIN');
      try {
        for (const stmt of statements) await db.execute(stmt);
        await db.execute('COMMIT');
      } catch (err) {
        await db.execute('ROLLBACK');
        throw new Error(`Migration "${dir}" falhou: ${(err as Error).message}`);
      }
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await db.execute({
      sql: `INSERT OR IGNORE INTO "tecnicos"
              (usuario, nome, "senhaHash", cargo, ativo, "criadoEm", "atualizadoEm")
            VALUES (?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [usuario, nomeAdmin, senhaHash],
    });

    console.log(`[tenantInit] ✅ "${dbFile}" criado com ${migrationDirs.length} migration(s). Admin: ${usuario}`);
  } finally {
    await db.close();
  }

  return dbFile;
}

// ── PostgreSQL: cria banco e aplica schema via prisma db push ──────────────────
async function criarBancaTenantPg(
  cnpjLimpo: string,
  usuario: string,
  senha: string,
  nomeAdmin: string,
): Promise<string> {
  const { Client } = require('pg');
  const prefix  = process.env.PG_TENANT_PREFIX || 'v9_tenant_';
  const dbName  = `${prefix}${cnpjLimpo}`;
  const tenantUrl = getTenantUrl(cnpjLimpo);

  // Determina configuração do admin a partir de DATABASE_URL ou variáveis individuais
  let adminConfig: object;
  if (process.env.DATABASE_URL) {
    const { host, port, user, password, database } = parseDatabaseUrl(process.env.DATABASE_URL);
    adminConfig = { host, port, user, password, database };
  } else {
    adminConfig = {
      host:     process.env.PG_HOST     || 'localhost',
      port:     Number(process.env.PG_PORT || 5432),
      user:     process.env.PG_USER     || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_MASTER_DB || 'v9_master',
    };
  }

  // Conecta ao banco master para criar o banco do tenant
  const admin = new Client(adminConfig);
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rows.length > 0) {
      console.log(`[tenantInit] Database "${dbName}" já existe, pulando criação.`);
      return dbName;
    }
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[tenantInit] ✅ Database PostgreSQL "${dbName}" criado.`);
  } finally {
    await admin.end();
  }

  // Aplica o schema via prisma db push
  console.log(`[tenantInit] Aplicando schema em "${dbName}"...`);
  execSync(`npx prisma db push --url "${tenantUrl}"`, {
    env: { ...process.env, DATABASE_URL: tenantUrl },
    stdio: 'inherit',
  });

  // Cria o admin inicial no tenant via adapter-pg
  const { PrismaClient } = require('@prisma/client');
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const pool = new Pool({ connectionString: tenantUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    await (prisma as any).tecnico.upsert({
      where:  { username: usuario },
      create: { username: usuario, name: nomeAdmin, passwordHash: senhaHash, role: 'admin', active: true },
      update: {},
    });
    console.log(`[tenantInit] ✅ Admin "${usuario}" criado em "${dbName}".`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  return dbName;
}

// ── MySQL: cria banco e aplica schema via prisma db push ───────────────────────
async function criarBancaTenantMysql(
  cnpjLimpo: string,
  usuario: string,
  senha: string,
  nomeAdmin: string,
): Promise<string> {
  const mysql = require('mysql2/promise');
  const prefix  = process.env.MYSQL_TENANT_PREFIX || 'v9_tenant_';
  const dbName  = `${prefix}${cnpjLimpo}`;
  const tenantUrl = getTenantUrl(cnpjLimpo);

  // Conecta sem banco definido para criar o banco do tenant
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     Number(process.env.MYSQL_PORT || 3306),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });

  try {
    const [rows] = await conn.query(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName],
    );
    if ((rows as any[]).length > 0) {
      console.log(`[tenantInit] Database "${dbName}" já existe, pulando criação.`);
      return dbName;
    }
    await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`[tenantInit] ✅ Database MySQL "${dbName}" criado.`);
  } finally {
    await conn.end();
  }

  // Aplica o schema via prisma db push
  console.log(`[tenantInit] Aplicando schema em "${dbName}"...`);
  execSync(`npx prisma db push --url "${tenantUrl}"`, {
    env: { ...process.env, DATABASE_URL: tenantUrl },
    stdio: 'inherit',
  });

  // Cria o admin inicial no tenant
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    await (prisma as any).tecnico.upsert({
      where:  { username: usuario },
      create: { username: usuario, name: nomeAdmin, passwordHash: senhaHash, role: 'admin', active: true },
      update: {},
    });
    console.log(`[tenantInit] ✅ Admin "${usuario}" criado em "${dbName}".`);
  } finally {
    await prisma.$disconnect();
  }

  return dbName;
}

// ── Ponto de entrada: seleciona driver pelo DB_TYPE ───────────────────────────
export async function criarBancaTenant(
  cnpjLimpo: string,
  usuario: string,
  senha: string,
  nomeAdmin: string,
): Promise<string> {
  switch (DB_TYPE) {
    case 'postgresql':
    case 'postgres':
      return criarBancaTenantPg(cnpjLimpo, usuario, senha, nomeAdmin);
    case 'mysql':
      return criarBancaTenantMysql(cnpjLimpo, usuario, senha, nomeAdmin);
    default:
      return criarBancaTenantSqlite(cnpjLimpo, usuario, senha, nomeAdmin);
  }
}
