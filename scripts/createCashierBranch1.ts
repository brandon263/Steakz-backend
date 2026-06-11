import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'cashier1@steakz.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Cashier already exists', existing.id);
    await prisma.$disconnect();
    return;
  }

  const branch = await prisma.branch.findUnique({ where: { id: 1 } });
  if (!branch) {
    console.error('Branch id=1 not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash('cashier123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Branch Cashier',
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
