import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole, requireBranch } from '../middleware/auth.js';

const router = Router();

router.get('/:branchId', async (req: Request, res: Response) => {
  const branchIdParam = req.params['branchId'];
  const branchIdString = Array.isArray(branchIdParam) ? branchIdParam[0] : branchIdParam;
  const branchId = parseInt(branchIdString ?? '0');
  const items = await prisma.menuItem.findMany({
    where:   { branchId, isAvailable: true },
    orderBy: { category: 'asc' },
  });
  res.json(items);
});

router.post(
  '/',
  verifyToken,
  requireRole(['BRANCH_MANAGER', 'ADMIN']),
  async (req: Request, res: Response) => {
    const targetBranchId = req.user!.role === 'ADMIN'
      ? (req.body as { branchId?: number }).branchId
      : req.user!.branchId;

    if (!targetBranchId) {
      res.status(400).json({ error: 'branchId is required for admins or branch manager access is missing.' });
      return;
    }

    const { name, description, price, category } = req.body as {
      name: string; description?: string; price: number; category: string;
    };
    if (!name || !price || !category) {
      res.status(400).json({ error: 'name, price and category are required.' });
      return;
    }

    const item = await prisma.menuItem.create({
      data: { name, description, price, category, branchId: targetBranchId },
    });
    res.status(201).json(item);
  }
);

router.patch(
  '/:id',
  verifyToken,
  requireRole(['BRANCH_MANAGER', 'ADMIN']),
  async (req: Request, res: Response) => {
    const branchId = req.user!.branchId;
    const idParam = req.params['id'];
    const idString = Array.isArray(idParam) ? idParam[0] : idParam;
    const id = parseInt(idString ?? '0');
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }
    if (req.user!.role === 'BRANCH_MANAGER' && item.branchId !== branchId) {
      res.status(403).json({ error: 'Item not found in your branch.' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    for (const key of ['name', 'description', 'price', 'category', 'branchId'] as const) {
      if (key in req.body) updateData[key] = req.body[key];
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data:  updateData,
    });
    res.json(updated);
  }
);

router.delete(
  '/:id',
  verifyToken,
  requireRole(['BRANCH_MANAGER', 'ADMIN']),
  async (req: Request, res: Response) => {
    const branchId = req.user!.branchId;
    const idParam = req.params['id'];
    const idString = Array.isArray(idParam) ? idParam[0] : idParam;
    const id = parseInt(idString ?? '0');
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Menu item not found.' });
      return;
    }
    if (req.user!.role === 'BRANCH_MANAGER' && item.branchId !== branchId) {
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
    res.status(204).send();
  }
);

export default router;
