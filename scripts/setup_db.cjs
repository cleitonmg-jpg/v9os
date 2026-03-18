/**
 * setup_db.cjs
 * Configura o banco de dados do V9 Orçamentos com base em DB_TYPE no .env
 *
 * O que faz:
 *  1. Lê DB_TYPE do .env
 *  2. Reescreve prisma/schema.prisma com o provider correto
 *  3. Executa `prisma generate`
 *  4. Executa init_master_db.cjs (cria tabelas master + usuário Root)
 *
 * Uso:
 *   node scripts/setup_db.cjs
 *   npm run db:setup
 */
require('dotenv').config();
const fs   = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// ── Modelos Prisma (compartilhado entre todos os providers) ────────────────────
const MODELS = `
model Tecnico {
  id            Int            @id @default(autoincrement())
  usuario       String         @unique
  nome          String
  senhaHash     String
  cargo         String         @default("technician")
  ativo         Boolean        @default(true)

  itensOrdem    ItemOrdem[]
  logsAuditoria LogAuditoria[]

  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt

  @@map("tecnicos")
}

model Cliente {
  id            Int            @id @default(autoincrement())
  nome          String
  cpfCnpj       String?        @unique
  telefone      String
  email         String?
  endereco      String?

  veiculos      Veiculo[]
  ordensServico OrdemServico[]

  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt

  @@map("clientes")
}

model Veiculo {
  id            Int            @id @default(autoincrement())
  placa         String         @unique
  marca         String
  modelo        String
  ano           Int
  cor           String
  chassi        String?
  quilometragem Int

  clienteId     Int
  cliente       Cliente        @relation(fields: [clienteId], references: [id])

  ordensServico OrdemServico[]

  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt

  @@map("veiculos")
}

model OrdemServico {
  id              Int         @id @default(autoincrement())
  numero          Int         @unique
  tipo            String      @default("BUDGET")
  status          String      @default("OPEN")
  data            DateTime    @default(now())

  clienteId       Int
  cliente         Cliente     @relation(fields: [clienteId], references: [id])

  veiculoId       Int
  veiculo         Veiculo     @relation(fields: [veiculoId], references: [id])

  defeitoRelatado String?
  valorTotal      Float       @default(0)
  observacoes     String?

  itens           ItemOrdem[]

  criadoEm     DateTime      @default(now())
  atualizadoEm DateTime      @updatedAt

  @@map("ordens_servico")
}

model ItemOrdem {
  id             Int          @id @default(autoincrement())
  ordemServicoId Int
  ordemServico   OrdemServico @relation(fields: [ordemServicoId], references: [id], onDelete: Cascade)

  descricao      String
  quantidade     Float        @default(1)
  precoUnitario  Float
  precoTotal     Float
  tipo           String       @default("SERVICE")

  tecnicoId      Int?
  tecnico        Tecnico?     @relation(fields: [tecnicoId], references: [id], onDelete: SetNull)

  criadoEm     DateTime       @default(now())
  atualizadoEm DateTime       @updatedAt

  @@map("itens_ordem")
}

model LogAuditoria {
  id         Int      @id @default(autoincrement())
  tecnicoId  Int
  tecnico    Tecnico  @relation(fields: [tecnicoId], references: [id])

  acao       String
  entidade   String
  entidadeId Int
  detalhes   String?
  dataHora   DateTime @default(now())

  @@map("logs_auditoria")
}

model ItemCatalogo {
  id            Int      @id @default(autoincrement())
  descricao     String
  tipo          String   @default("SERVICE")
  precoCusto    Float    @default(0)
  precoUnitario Float    @default(0)
  estoque       Int      @default(0)
  ativo         Boolean  @default(true)

  criadoEm     DateTime @default(now())
  atualizadoEm DateTime @updatedAt

  @@map("itens_catalogo")
}
`;

// ── Gera o conteúdo do schema.prisma conforme o provider ──────────────────────
function buildSchema(dbType) {
  const generator = `generator client {\n  provider = "prisma-client-js"\n}\n`;

  switch (dbType) {
    case 'postgresql':
    case 'postgres':
      // Prisma 7: url fica no prisma.config.ts, não no schema
      return `${generator}
// Gerado por setup_db.cjs — DB_TYPE=postgresql
datasource db {
  provider = "postgresql"
}
${MODELS}`;
    case 'mysql':
      return `${generator}
// Gerado por setup_db.cjs — DB_TYPE=mysql
datasource db {
  provider = "mysql"
}
${MODELS}`;
    default:
      return `${generator}
// Gerado por setup_db.cjs — DB_TYPE=sqlite
datasource db {
  provider = "sqlite"
}
${MODELS}`;
  }
}

function buildPgUrl(dbName) {
  const user = process.env.PG_USER     || 'postgres';
  const pass = encodeURIComponent(process.env.PG_PASSWORD || '');
  const host = process.env.PG_HOST     || 'localhost';
  const port = process.env.PG_PORT     || '5432';
  return `postgresql://${user}:${pass}@${host}:${port}/${dbName}`;
}

function buildMysqlUrl(dbName) {
  const user = process.env.MYSQL_USER     || 'root';
  const pass = encodeURIComponent(process.env.MYSQL_PASSWORD || '');
  const host = process.env.MYSQL_HOST     || 'localhost';
  const port = process.env.MYSQL_PORT     || '3306';
  return `mysql://${user}:${pass}@${host}:${port}/${dbName}`;
}

// ── Atualiza o .env com a DATABASE_URL correta para o Prisma CLI ──────────────
function updateEnvDatabaseUrl(dbType) {
  const envPath = path.join(process.cwd(), '.env');
  let content = fs.readFileSync(envPath, 'utf8');

  let newUrl;
  switch (dbType) {
    case 'postgresql':
    case 'postgres':
      newUrl = buildPgUrl(process.env.PG_MASTER_DB || 'v9_master');
      break;
    case 'mysql':
      newUrl = buildMysqlUrl(process.env.MYSQL_MASTER_DB || 'v9_master');
      break;
    default:
      newUrl = 'file:./tenant.db';
  }

  // Substitui ou adiciona DATABASE_URL
  if (content.match(/^DATABASE_URL=/m)) {
    content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${newUrl}"`);
  } else {
    content += `\nDATABASE_URL="${newUrl}"\n`;
  }

  fs.writeFileSync(envPath, content);
  console.log(`  DATABASE_URL atualizado → ${newUrl}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 V9 Orçamentos — Setup de Banco (DB_TYPE=${DB_TYPE.toUpperCase()})\n`);

  // 1. Reescreve schema.prisma
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schemaContent = buildSchema(DB_TYPE);
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('✅ prisma/schema.prisma atualizado.');

  // 2. Atualiza DATABASE_URL no .env
  updateEnvDatabaseUrl(DB_TYPE);

  // 3. Regenera o Prisma client
  console.log('\n📦 Executando prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // 4. Inicializa o banco master
  console.log('\n🗄️  Inicializando banco master...');
  execSync('node scripts/init_master_db.cjs', { stdio: 'inherit' });

  console.log('\n✅ Setup concluído! Execute: npm run server\n');
  console.log('Bancos configurados:');
  switch (DB_TYPE) {
    case 'postgresql':
    case 'postgres':
      console.log(`  Master:  PostgreSQL → ${process.env.PG_MASTER_DB || 'v9_master'} em ${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}`);
      console.log(`  Tenants: PostgreSQL → prefixo "${process.env.PG_TENANT_PREFIX || 'v9_tenant_'}{cnpj}"`);
      break;
    case 'mysql':
      console.log(`  Master:  MySQL → ${process.env.MYSQL_MASTER_DB || 'v9_master'} em ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}`);
      console.log(`  Tenants: MySQL → prefixo "${process.env.MYSQL_TENANT_PREFIX || 'v9_tenant_'}{cnpj}"`);
      break;
    default:
      console.log('  Master:  SQLite → master.db');
      console.log('  Tenants: SQLite → {cnpj}_OS.db');
  }
}

main().catch(e => {
  console.error('❌ Erro no setup:', e.message);
  process.exit(1);
});
