import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole, requireBranch } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['BRANCH_MANAGER']), requireBranch);

router.get('/overview', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const branch = await prisma.branch.findUnique({
    where:   { id: branchId },
    include: { _count: { select: { orders: true, users: true, tables: true } } },
  });
  res.json(branch);
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

router.get('/staff', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const staff = await prisma.user.findMany({
    where:  { branchId, role: { in: ['CHEF', 'CASHIER', 'BRANCH_MANAGER'] } },
    select: { id: true, name: true, role: true, salary: true, isActive: true },
  });
  res.json(staff);
});

router.get('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const items = await prisma.menuItem.findMany({
    where: { branchId, isAvailable: true },
    orderBy: { category: 'asc' },
  });
  res.json(items);
});

router.get('/bookings', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const bookings = await prisma.booking.findMany({
    where:   { table: { branchId } },
    include: {
      customer: { select: { name: true } },
      table:    { select: { tableNumber: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(bookings);
});

router.get('/confirmed-bookings', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const confirmedBookings = await prisma.booking.findMany({
    where: {
      table: { branchId },
      status: 'CONFIRMED',
      date: { gte: new Date() },
    },
    include: {
      customer: { select: { name: true } },
      table: { select: { id: true, tableNumber: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(confirmedBookings);
});

router.get('/tables', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const tables = await prisma.table.findMany({
    where: { branchId },
    include: {
      bookings: { 
        include: { customer: { select: { name: true } } }, 
        orderBy: { date: 'asc' },
        where: { date: { gte: new Date() } },
      },
    },
    orderBy: { tableNumber: 'asc' },
  });
  res.json(tables);
});

router.post('/tables', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const tableNumber = parseInt(String(req.body.tableNumber), 10);
  const capacity = parseInt(String(req.body.capacity), 10);
  const isAvailable = req.body.isAvailable !== false;

  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    return res.status(400).json({ error: 'Table number must be a positive integer.' });
  }

  if (![2, 4, 6, 8, 10].includes(capacity)) {
    return res.status(400).json({ error: 'Capacity must be one of 2, 4, 6, 8, or 10.' });
  }

  const existingTable = await prisma.table.findUnique({
    where: { tableNumber_branchId: { tableNumber, branchId } },
  });

  if (existingTable) {
    return res.status(409).json({ error: 'A table with that number already exists in this branch.' });
  }

  const table = await prisma.table.create({
    data: {
      branchId,
      tableNumber,
      capacity,
      isAvailable,
    },
  });

  res.status(201).json(table);
});

router.put('/tables/:id', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const tableId = parseInt(String(req.params.id), 10);
  const capacity = parseInt(String(req.body.capacity), 10);
  const isAvailable = req.body.isAvailable !== false;

  if (!Number.isInteger(tableId) || tableId < 1) {
    return res.status(400).json({ error: 'Invalid table ID.' });
  }

  if (![2, 4, 6, 8, 10].includes(capacity)) {
    return res.status(400).json({ error: 'Capacity must be one of 2, 4, 6, 8, or 10.' });
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || table.branchId !== branchId) {
    return res.status(404).json({ error: 'Table not found.' });
  }

  const updatedTable = await prisma.table.update({
    where: { id: tableId },
    data: { capacity, isAvailable },
  });

  res.json(updatedTable);
});

router.delete('/tables/:id', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const tableId = parseInt(String(req.params.id), 10);

  if (!Number.isInteger(tableId) || tableId < 1) {
    return res.status(400).json({ error: 'Invalid table ID.' });
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || table.branchId !== branchId) {
    return res.status(404).json({ error: 'Table not found.' });
  }

  const now = new Date();
  const futureBookingCount = await prisma.booking.count({
    where: {
      tableId,
      date: { gte: now },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });

  if (futureBookingCount > 0) {
    return res.status(400).json({
      error: 'Cannot delete a table with active or future bookings.',
    });
  }

  const tableBookings = await prisma.booking.findMany({
    where: { tableId },
    select: { id: true },
  });

  if (tableBookings.length > 0) {
    const bookingIds = tableBookings.map(b => b.id);
    await prisma.order.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }

  await prisma.table.delete({ where: { id: tableId } });
  res.json({ message: 'Table deleted successfully.' });
});

router.get('/sales', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const result = await prisma.order.aggregate({
    where:  { branchId, status: { in: ['DONE', 'DELIVERED'] } },
    _sum:   { total: true },
    _count: { id: true },
  });
  res.json({ totalSales: result._sum.total ?? 0, orderCount: result._count.id });
});

export default router;
