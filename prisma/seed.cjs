require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const url = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('user123', 10);

  const admin = await prisma.technician.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      name: 'Administrador V9',
      passwordHash,
      role: 'admin',
    },
  });
  console.log('✅ Usuário criado:', admin.username, '/ user123');

  const client = await prisma.client.upsert({
    where: { cpfCnpj: '123.456.789-00' },
    update: {},
    create: {
      name: 'João Silva',
      cpfCnpj: '123.456.789-00',
      phone: '(37) 99999-8888',
      email: 'joao@email.com',
      address: 'Rua das Flores, 123, Divinópolis - MG',
    },
  });
  console.log('✅ Cliente de teste:', client.name);

  const vehicle = await prisma.vehicle.upsert({
    where: { plate: 'ABC-1234' },
    update: {},
    create: {
      plate: 'ABC-1234',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2022,
      color: 'Prata',
      mileage: 15000,
      clientId: client.id,
    },
  });
  console.log('✅ Veículo de teste:', vehicle.plate);
  console.log('\n🚀 Seed concluído! Login: user / user123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
