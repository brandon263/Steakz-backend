import prisma from './src/lib/prisma.js';
(async () => {
  const bookings = await prisma.booking.findMany({ include: { table: true, customer: true } });
  console.log(JSON.stringify(bookings, null, 2));
  await prisma.();
})();
