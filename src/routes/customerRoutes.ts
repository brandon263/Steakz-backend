import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.patch('/bookings/:id/confirm', verifyToken, requireRole(['CASHIER', 'BRANCH_MANAGER', 'ADMIN']), async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0', 10);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: 'CONFIRMED' },
  });
  res.json(updated);
});

router.use(verifyToken, requireRole(['CUSTOMER']));

router.get('/bookings/:id', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0', 10);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { table: { include: { branch: { select: { id: true, name: true } } } } },
  });

  if (!booking || booking.customerId !== customerId) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  res.json(booking);
});

router.get('/bookings', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const bookings = await prisma.booking.findMany({
    where:   { customerId },
    include: { table: { include: { branch: { select: { id: true, name: true } } } } },
    orderBy: { date: 'desc' },
  });
  res.json(bookings);
});

router.post('/bookings', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { tableId, guestCount, date } = req.body as {
    tableId: number; guestCount: number; date: string;
  };

  if (!tableId || !guestCount || !date) {
    res.status(400).json({ error: 'tableId, guestCount and date are required.' });
    return;
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || !table.isAvailable) {
    res.status(400).json({ error: 'Table is not available.' });
    return;
  }

  const booking = await prisma.booking.create({
    data: { customerId, tableId, guestCount, date: new Date(date) },
    include: { table: { include: { branch: { select: { name: true } } } } },
  });
  res.status(201).json(booking);
});

router.delete('/bookings/:id', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== customerId) {
    res.status(403).json({ error: 'Booking not found.' });
    return;
  }
  await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  res.json({ message: 'Booking cancelled.' });
});

router.get('/orders', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const orders = await prisma.order.findMany({
    where:   { customerId },
    include: {
      items:  { include: { menuItem: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.post('/orders', async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { bookingId, items } = req.body as {
    bookingId: number;
    items: { menuItemId: number; quantity: number }[];
  };

  if (!bookingId || !items || items.length === 0) {
    res.status(400).json({ error: 'bookingId and items are required.' });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { table: true },
  });

  if (!booking || booking.customerId !== customerId) {
    res.status(403).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({ error: 'Order can only be placed for confirmed bookings.' });
    return;
  }

  const branchId = booking.table.branchId;
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map(i => i.menuItemId) }, branchId },
  });

  if (menuItems.length !== items.length) {
    res.status(400).json({ error: 'One or more selected menu items are invalid for this branch.' });
    return;
  }

  const invalidQuantity = items.some(i => i.quantity <= 0);
  if (invalidQuantity) {
    res.status(400).json({ error: 'Item quantities must be greater than zero.' });
    return;
  }

  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]));
  const total    = items.reduce((sum, i) => sum + (priceMap[i.menuItemId] ?? 0) * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      customerId,
      bookingId,
      branchId,
      total,
      items: {
        create: items.map(i => ({
          quantity:  i.quantity,
          unitPrice: priceMap[i.menuItemId]!,
          menuItem: {
            connect: { id: i.menuItemId },
          },
        })),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });
  res.status(201).json(order);
});

export default router;
