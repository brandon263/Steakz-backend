import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole, requireBranch } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['CHEF']), requireBranch);

router.get('/orders', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const orders = await prisma.order.findMany({
    where:   { branchId, status: { in: ['PENDING', 'PREPARING', 'DONE'] } },
    include: { items: { include: { menuItem: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(orders);
});

router.patch('/orders/:id/start', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.branchId !== branchId) {
    res.status(403).json({ error: 'Order not found in your branch.' });
    return;
  }
  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'PREPARING' },
  });
  res.json(updated);
});

router.patch('/orders/:id/done', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.branchId !== branchId) {
    res.status(403).json({ error: 'Order not found in your branch.' });
    return;
  }
  if (order.status !== 'PREPARING') {
    res.status(400).json({ error: 'Only preparing orders can be marked complete.' });
    return;
  }
  const updated = await prisma.order.update({
    where: { id },
    data:  { status: 'DONE' },
  });
  res.json(updated);
});

router.get('/menu', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const items = await prisma.menuItem.findMany({ where: { branchId, isAvailable: true } });
  res.json(items);
});

router.delete('/menu/:id', async (req: Request, res: Response) => {
  const branchId = req.user!.branchId!;
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item || item.branchId !== branchId) {
    res.status(403).json({ error: 'Menu item not found in your branch.' });
    return;
  }

  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });

  if (orderItemCount > 0) {
    const updated = await prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
    res.json({ message: 'Menu item is currently in use and has been deactivated.', item: updated });
    return;
  }

  await prisma.menuItem.delete({ where: { id } });
  res.json({ message: 'Menu item deleted.' });
});

export default router;
