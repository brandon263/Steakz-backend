import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole, requireBranch } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['CASHIER']), requireBranch);

router.post('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const { customerId, bookingId, items } = req.body as {
    customerId?: number;
    bookingId?:  number;
    items: { menuItemId: number; quantity: number }[];
  };

  if (!items || items.length === 0) {
    res.status(400).json({ error: 'At least one item is required.' });
    return;
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map(i => i.menuItemId) }, branchId },
  });

  if (menuItems.length !== items.length) {
    res.status(400).json({ error: 'One or more menu items are invalid for this branch.' });
    return;
  }

  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]));
  const total    = items.reduce((sum, i) => sum + (priceMap[i.menuItemId] ?? 0) * i.quantity, 0);

  const order = await prisma.order.create({
    data: {
      branchId,
      customerId: customerId ?? null,
      bookingId:  bookingId  ?? null,
      total,
      items: {
        create: items.map(i => ({
          menuItemId: i.menuItemId,
          quantity:   i.quantity,
          unitPrice:  priceMap[i.menuItemId] ?? 0,
        })),
      },
    },
    include: { items: { include: { menuItem: true } } },
  });

  res.status(201).json(order);
});

router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const orders = await prisma.order.findMany({
    where:   { branchId },
    include: {
      items:    { include: { menuItem: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const items = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(items);
});

router.get('/bookings', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const bookings = await prisma.booking.findMany({
    where: {
      table: { branchId },
      status: 'PENDING',
    },
    include: {
      customer: { select: { name: true } },
      table:    { select: { tableNumber: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(bookings);
});

router.patch('/bookings/:id/confirm', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const bookingId = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    res.status(400).json({ error: 'Invalid booking ID.' });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { table: { select: { branchId: true } } },
  });

  if (!booking || booking.table.branchId !== branchId) {
    res.status(404).json({ error: 'Booking not found in your branch.' });
    return;
  }

  if (booking.status !== 'PENDING') {
    res.status(400).json({ error: 'Only pending bookings can be confirmed.' });
    return;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CONFIRMED' },
    include: {
      customer: { select: { name: true } },
      table:    { select: { tableNumber: true } },
    },
  });

  res.json(updated);
});

router.patch('/bookings/:id/reject', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const bookingId = parseInt(String(req.params.id), 10);
  if (!Number.isInteger(bookingId) || bookingId < 1) {
    res.status(400).json({ error: 'Invalid booking ID.' });
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { table: { select: { branchId: true } } },
  });

  if (!booking || booking.table.branchId !== branchId) {
    res.status(404).json({ error: 'Booking not found in your branch.' });
    return;
  }

  if (booking.status !== 'PENDING') {
    res.status(400).json({ error: 'Only pending bookings can be rejected.' });
    return;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
    include: {
      customer: { select: { name: true } },
      table:    { select: { tableNumber: true } },
    },
  });

  res.json(updated);
});

router.patch('/orders/:id/deliver', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.branchId !== branchId) {
    res.status(403).json({ error: 'Order not found in your branch.' });
    return;
  }
  if (order.status !== 'DONE') {
    res.status(400).json({ error: 'Only completed orders can be delivered.' });
    return;
  }
  const updated = await prisma.order.update({
    where: { id },
    data:  { status: 'DELIVERED' },
  });
  res.json(updated);
});

export default router;
