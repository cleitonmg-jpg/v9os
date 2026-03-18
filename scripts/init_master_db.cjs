/**
 * Inicializa o banco de dados master (empresas + administradores Root).
 * Suporta SQLite (padrão), PostgreSQL e MySQL via DB_TYPE no .env
 *
 * Uso:
 *   node scripts/init_master_db.cjs [--force]
 *
 * Para PostgreSQL aceita DATABASE_URL (string completa) ou variáveis individuais
 * PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_MASTER_DB.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('node:fs');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// ── Utilitário: parseia DATABASE_URL ──────────────────────────────────────────
function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host:     parsed.hostname,
      port:     Number(parsed.port || 5432),
      user:     parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

// ── DDL comum adaptado por banco ───────────────────────────────────────────────
const DDL_SQLITE = `
  CREATE TABLE IF NOT EXISTS administradores (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario  TEXT    NOT NULL UNIQUE DEFAULT 'Master',
    senha    TEXT    NOT NULL,
    nome     TEXT    NOT NULL DEFAULT 'Administrador Root'
  );
  CREATE TABLE IF NOT EXISTS empresas (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    nome          TEXT     NOT NULL,
    endereco      TEXT,
    cnpj          TEXT     NOT NULL UNIQUE,
    telefone      TEXT,
    email         TEXT,
    data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao    TEXT,
    ativo         INTEGER  NOT NULL DEFAULT 1,
    banco_dados   TEXT     NOT NULL,
    usuario_admin TEXT     NOT NULL,
    senha_admin   TEXT     NOT NULL
  );
`;

const DDL_PG = `
  CREATE TABLE IF NOT EXISTS administradores (
    id      SERIAL PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL UNIQUE DEFAULT 'Master',
    senha   TEXT        NOT NULL,
    nome    VARCHAR(200) NOT NULL DEFAULT 'Administrador Root'
  );
  CREATE TABLE IF NOT EXISTS empresas (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(200) NOT NULL,
    endereco      TEXT,
    cnpj          VARCHAR(20)  NOT NULL UNIQUE,
    telefone      VARCHAR(20),
    email         VARCHAR(200),
    data_cadastro TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao    TEXT,
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    banco_dados   VARCHAR(200) NOT NULL,
    usuario_admin VARCHAR(100) NOT NULL,
    senha_admin   TEXT         NOT NULL
  );
`;

const DDL_MYSQL = `
  CREATE TABLE IF NOT EXISTS administradores (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL UNIQUE DEFAULT 'Master',
    senha   TEXT        NOT NULL,
    nome    VARCHAR(200) NOT NULL DEFAULT 'Administrador Root'
  );
  CREATE TABLE IF NOT EXISTS empresas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(200) NOT NULL,
    endereco      TEXT,
    cnpj          VARCHAR(20)  NOT NULL UNIQUE,
    telefone      VARCHAR(20),
    email         VARCHAR(200),
    data_cadastro DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao    TEXT,
    ativo         TINYINT(1)   NOT NULL DEFAULT 1,
    banco_dados   VARCHAR(200) NOT NULL,
    usuario_admin VARCHAR(100) NOT NULL,
    senha_admin   TEXT         NOT NULL
  );
`;

// ── SQLite ─────────────────────────────────────────────────────────────────────
async function initSqlite(force) {
  const { createClient } = require('@libsql/client');
  const dbFile = 'master.db';

  if (fs.existsSync(dbFile) && !force) {
    console.log(`"${dbFile}" já existe. Garantindo usuário Root...`);
    await garantirRootSqlite();
    return;
  }
  if (fs.existsSync(dbFile) && force) {
    fs.rmSync(dbFile);
    console.log(`"${dbFile}" removido para recriação.`);
  }

  const db = createClient({ url: `file:./${dbFile}` });
  try {
    for (const stmt of DDL_SQLITE.split(';').map(s => s.trim()).filter(Boolean)) {
      await db.execute(stmt);
    }
    const senhaHash = await bcrypt.hash('Belvedere640@', 10);
    await db.execute({
      sql: `INSERT OR REPLACE INTO administradores (usuario, senha, nome) VALUES (?, ?, ?)`,
      args: ['Master', senhaHash, 'Administrador Root'],
    });
    console.log('✅ master.db (SQLite) criado com sucesso!');
    console.log('🔑 Root → Usuário: Master | Senha: Belvedere640@');
  } finally {
    await db.close();
  }
}

async function garantirRootSqlite() {
  const { createClient } = require('@libsql/client');
  const db = createClient({ url: 'file:./master.db' });
  try {
    const res = await db.execute(`SELECT id FROM administradores WHERE usuario = 'Master'`);
    if (res.rows.length === 0) {
      const senhaHash = await bcrypt.hash('Belvedere640@', 10);
      await db.execute({
        sql: `INSERT INTO administradores (usuario, senha, nome) VALUES (?, ?, ?)`,
        args: ['Master', senhaHash, 'Administrador Root'],
      });
      console.log('✅ Usuário Root criado.');
    } else {
      console.log('✅ Usuário Root já existe.');
    }
  } finally {
    await db.close();
  }
}

// ── PostgreSQL ─────────────────────────────────────────────────────────────────
async function initPostgres(force) {
  const { Client } = require('pg');

  // Determina configuração a partir de DATABASE_URL ou variáveis individuais
  let pgBase;
  const DATABASE_URL = process.env.DATABASE_URL;
  if (DATABASE_URL) {
    const parsed = parseDatabaseUrl(DATABASE_URL);
    if (!parsed) throw new Error('DATABASE_URL inválida.');
    pgBase = parsed;
  } else {
    pgBase = {
      host:     process.env.PG_HOST     || 'localhost',
      port:     Number(process.env.PG_PORT || 5432),
      user:     process.env.PG_USER     || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_MASTER_DB || 'v9_master',
    };
  }

  const masterDb = pgBase.database;

  // Tenta criar o banco master se não existir (usando o próprio banco como destino)
  // Se DATABASE_URL já aponta para o banco correto, apenas cria as tabelas.
  const adminConnConfig = { ...pgBase };

  const admin = new Client(adminConnConfig);
  await admin.connect();
  try {
    // Verifica se o banco existe (só relevante se masterDb != 'postgres')
    if (masterDb !== 'postgres') {
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [masterDb]);
      if (exists.rows.length === 0) {
        await admin.query(`CREATE DATABASE "${masterDb}"`);
        console.log(`✅ Database PostgreSQL "${masterDb}" criado.`);
      } else if (force) {
        console.log(`⚠️  Database "${masterDb}" já existe. --force não recria bancos PostgreSQL.`);
      }
    }
  } finally {
    await admin.end();
  }

  // Conecta ao banco master para criar tabelas
  const db = new Client(pgBase);
  await db.connect();
  try {
    for (const stmt of DDL_PG.split(';').map(s => s.trim()).filter(Boolean)) {
      await db.query(stmt);
    }
    const senhaHash = await bcrypt.hash('Belvedere640@', 10);
    await db.query(
      `INSERT INTO administradores (usuario, senha, nome)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario) DO NOTHING`,
      ['Master', senhaHash, 'Administrador Root'],
    );
    console.log(`✅ Banco master PostgreSQL "${masterDb}" pronto!`);
    console.log('🔑 Root → Usuário: Master | Senha: Belvedere640@');
  } finally {
    await db.end();
  }
}

// ── MySQL ──────────────────────────────────────────────────────────────────────
async function initMysql(force) {
  const mysql = require('mysql2/promise');
  const masterDb = process.env.MYSQL_MASTER_DB || 'v9_master';

  // Cria o banco master se não existir
  const adminConn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     Number(process.env.MYSQL_PORT || 3306),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });
  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${masterDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database MySQL "${masterDb}" garantido.`);
  } finally {
    await adminConn.end();
  }

  // Cria tabelas
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     Number(process.env.MYSQL_PORT || 3306),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: masterDb,
    multipleStatements: true,
  });
  try {
    await conn.query(DDL_MYSQL);
    const senhaHash = await bcrypt.hash('Belvedere640@', 10);
    await conn.query(
      `INSERT IGNORE INTO administradores (usuario, senha, nome) VALUES (?, ?, ?)`,
      ['Master', senhaHash, 'Administrador Root'],
    );
    console.log(`✅ Banco master MySQL "${masterDb}" pronto!`);
    console.log('🔑 Root → Usuário: Master | Senha: Belvedere640@');
  } finally {
    await conn.end();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const force = process.argv.includes('--force');
  console.log(`[init_master_db] DB_TYPE = ${DB_TYPE.toUpperCase()}`);

  switch (DB_TYPE) {
    case 'postgresql':
    case 'postgres':
      await initPostgres(force);
      break;
    case 'mysql':
      await initMysql(force);
      break;
    default:
      await initSqlite(force);
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e.message);
  process.exit(1);
});
