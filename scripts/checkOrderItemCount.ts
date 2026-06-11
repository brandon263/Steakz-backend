import prisma from '../src/lib/prisma.js';

async function main() {
  try {
    const count = await prisma.orderItem.count({ where: { menuItemId: 17 } });
    console.log('count', count);
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
