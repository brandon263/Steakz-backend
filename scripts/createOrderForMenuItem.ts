import prisma from '../src/lib/prisma';

async function main() {
  const menuItemId = parseInt(process.argv[2] ?? '17', 10);
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) {
    console.error('Menu item not found', menuItemId);
    process.exit(1);
  }

  // find or create a test customer
  const email = 'apitest.customer@local.test';
  let customer = await prisma.user.findUnique({ where: { email } });
  if (!customer) {
    customer = await prisma.user.create({ data: { name: 'API Test', email, password: 'noop', role: 'CUSTOMER' } });
  }

  const table = await prisma.table.findFirst({ where: { branchId: menuItem.branchId } });
  if (!table) {
    console.error('No table for branch', menuItem.branchId);
    process.exit(1);
  }

  const booking = await prisma.booking.create({ data: { customerId: customer.id, tableId: table.id, guestCount: 2, date: new Date(), status: 'CONFIRMED' } });

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      bookingId: booking.id,
      branchId: menuItem.branchId,
      total: menuItem.price,
      items: { create: [{ menuItem: { connect: { id: menuItemId } }, quantity: 1, unitPrice: menuItem.price }] },
    },
  });

  console.log('Created order id=', order.id, 'for menuItem', menuItemId);
  await prisma.$disconnect();
}

main().catch(e=>{console.error(e); process.exit(1)});
