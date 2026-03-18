import { PrismaClient } from '../src/generated/master';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./master.db'
    }
  }
});

async function main() {
  const password = 'Belvedere640@';
  const hashedPassword = await bcrypt.hash(password, 10);

  const root = await prisma.administrador.upsert({
    where: { usuario: 'Master' },
    update: {
      senha: hashedPassword,
    },
    create: {
      usuario: 'Master',
      senha: hashedPassword,
      nome: 'Administrador Root',
    },
  });

  console.log('✅ Usuário Root (Master) criado/atualizado com sucesso!');
  console.log('Usuário: Master');
  console.log('Senha: Belvedere640@');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
