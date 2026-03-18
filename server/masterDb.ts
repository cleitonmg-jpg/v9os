/**
 * masterDb.ts
 * Abstração da conexão com o banco master (empresas + administradores Root).
 * Suporta SQLite (padrão), PostgreSQL e MySQL via DB_TYPE no .env
 *
 * Para PostgreSQL, aceita DATABASE_URL (string completa) ou variáveis individuais
 * PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_MASTER_DB.
 */
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
dotenv.config();

const require = createRequire(import.meta.url);

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

export interface DbRow { [key: string]: unknown }
export interface QueryResult { rows: DbRow[] }

export interface MasterDb {
  execute(query: { sql: string; args?: unknown[] } | string): Promise<QueryResult>;
}

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

// ── SQLite via @libsql/client ──────────────────────────────────────────────────
function createSqliteDb(): MasterDb {
  const { createClient } = require('@libsql/client');
  const client = createClient({ url: 'file:./master.db' });
  return {
    async execute(query) {
      const result = typeof query === 'string'
        ? await client.execute(query)
        : await client.execute({ sql: query.sql, args: query.args ?? [] });
      return { rows: result.rows as DbRow[] };
    },
  };
}

// ── PostgreSQL via pg ──────────────────────────────────────────────────────────
function createPgDb(): MasterDb {
  const { Pool } = require('pg');

  const DATABASE_URL = process.env.DATABASE_URL;
  const pool = DATABASE_URL
    ? new Pool({ connectionString: DATABASE_URL })
    : new Pool({
        host:     process.env.PG_HOST     || 'localhost',
        port:     Number(process.env.PG_PORT || 5432),
        user:     process.env.PG_USER     || 'postgres',
        password: process.env.PG_PASSWORD || '',
        database: process.env.PG_MASTER_DB || 'v9_master',
      });

  pool.on('error', (err: Error) => console.error('[masterDb/pg] pool error:', err.message));
  return {
    async execute(query) {
      let sql: string, args: unknown[] = [];
      if (typeof query === 'string') { sql = query; }
      else { sql = query.sql; args = query.args ?? []; }
      // Converte ? em $1, $2, … (padrão do pg)
      let i = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++i}`);
      const result = await pool.query(pgSql, args);
      return { rows: result.rows };
    },
  };
}

// ── MySQL via mysql2 ────────────────────────────────────────────────────────────
function createMysqlDb(): MasterDb {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host:            process.env.MYSQL_HOST     || 'localhost',
    port:            Number(process.env.MYSQL_PORT || 3306),
    user:            process.env.MYSQL_USER     || 'root',
    password:        process.env.MYSQL_PASSWORD || '',
    database:        process.env.MYSQL_MASTER_DB || 'v9_master',
    waitForConnections: true,
    connectionLimit: 10,
  });
  return {
    async execute(query) {
      let sql: string, args: unknown[] = [];
      if (typeof query === 'string') { sql = query; }
      else { sql = query.sql; args = query.args ?? []; }
      const [rows] = await pool.query(sql, args);
      return { rows: rows as DbRow[] };
    },
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────
function createMasterDb(): MasterDb {
  switch (DB_TYPE) {
    case 'postgresql':
    case 'postgres':
      console.log('[masterDb] usando PostgreSQL');
      return createPgDb();
    case 'mysql':
      console.log('[masterDb] usando MySQL');
      return createMysqlDb();
    default:
      return createSqliteDb();
  }
}

export const masterDb = createMasterDb();

// ── Helpers de URL para os tenants ─────────────────────────────────────────────
export function getTenantUrl(cnpj: string): string {
  switch (DB_TYPE) {
    case 'postgresql':
    case 'postgres': {
      const prefix = process.env.PG_TENANT_PREFIX || 'v9_tenant_';
      // Suporta DATABASE_URL ou variáveis individuais
      if (process.env.DATABASE_URL) {
        const { host, port, user, password } = parseDatabaseUrl(process.env.DATABASE_URL);
        const pass = encodeURIComponent(password);
        return `postgresql://${user}:${pass}@${host}:${port}/${prefix}${cnpj}`;
      }
      const host = process.env.PG_HOST     || 'localhost';
      const port = process.env.PG_PORT     || '5432';
      const user = process.env.PG_USER     || 'postgres';
      const pass = encodeURIComponent(process.env.PG_PASSWORD || '');
      return `postgresql://${user}:${pass}@${host}:${port}/${prefix}${cnpj}`;
    }
    case 'mysql': {
      const prefix = process.env.MYSQL_TENANT_PREFIX || 'v9_tenant_';
      const host   = process.env.MYSQL_HOST     || 'localhost';
      const port   = process.env.MYSQL_PORT     || '3306';
      const user   = process.env.MYSQL_USER     || 'root';
      const pass   = encodeURIComponent(process.env.MYSQL_PASSWORD || '');
      return `mysql://${user}:${pass}@${host}:${port}/${prefix}${cnpj}`;
    }
    default:
      return `file:./${cnpj}_OS.db`;
  }
}

export { DB_TYPE };
