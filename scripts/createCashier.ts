import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const email = 'cashier@steakz.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Cashier already exists', existing.id);
    await prisma.$disconnect();
    return;
  }

  const branch = await prisma.branch.findUnique({ where: { name: 'Steakz Uptown' } });
  if (!branch) {
    console.error('Branch Steakz Uptown not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash('cashier123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Uptown Cashier',
      email,
      password: hashed,
      role: 'CASHIER',
      branchId: branch.id,
    },
  });
  console.log('Created cashier', user.id);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
