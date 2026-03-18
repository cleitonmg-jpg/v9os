const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        current += char;
      }
      continue;
    }

    if (!inSingleQuote && char === '-' && next === '-') {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "'" && !inLineComment) {
      const prev = i > 0 ? sql[i - 1] : '';
      if (prev !== '\\') inSingleQuote = !inSingleQuote;
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

async function applyMigration(db, migrationSql, label) {
  const statements = splitSqlStatements(migrationSql);
  if (statements.length === 0) return;

  await db.execute('BEGIN');
  try {
    for (const statement of statements) {
      await db.execute(statement);
    }
    await db.execute('COMMIT');
  } catch (err) {
    await db.execute('ROLLBACK');
    err.message = `[${label}] ${err.message}`;
    throw err;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const force = args.has('--force');

  const dbFile = 'tenant.db';
  if (fs.existsSync(dbFile)) {
    if (!force) {
      console.error(`Arquivo "${dbFile}" já existe. Use --force para recriar.`);
      process.exit(1);
    }
    fs.rmSync(dbFile);
  }

  const migrationsRoot = path.join(process.cwd(), 'prisma', 'migrations');
  if (!fs.existsSync(migrationsRoot)) {
    console.error('Pasta prisma/migrations não encontrada.');
    process.exit(1);
  }

  const migrationDirs = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(migrationsRoot, d.name, 'migration.sql')))
    .map((d) => d.name)
    .sort();

  const db = createClient({ url: `file:./${dbFile}` });
  try {
    for (const dir of migrationDirs) {
      const p = path.join(migrationsRoot, dir, 'migration.sql');
      const sql = fs.readFileSync(p, 'utf8');
      await applyMigration(db, sql, dir);
    }
  } finally {
    await db.close();
  }

  console.log(`OK: criado "${dbFile}" com ${migrationDirs.length} migration(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

