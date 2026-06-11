import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['HQ_MANAGER', 'ADMIN']));

router.get('/overview', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, address: true, _count: { select: { users: true } } },
  });

  const orderCounts = await prisma.order.groupBy({
    by: ['branchId', 'status'],
    _count: { id: true },
    where: { status: { in: ['PENDING', 'DONE', 'DELIVERED'] } },
  });

  const branchStats = branches.map(branch => {
    const counts = orderCounts.filter(o => o.branchId === branch.id);
    const pendingOrders = counts
      .filter(item => item.status === 'PENDING')
      .reduce((sum, item) => sum + item._count.id, 0);
    const completeOrders = counts
      .filter(item => item.status === 'DONE' || item.status === 'DELIVERED')
      .reduce((sum, item) => sum + item._count.id, 0);

    return {
      ...branch,
      pendingOrders,
      completeOrders,
    };
  });

  res.json(branchStats);
});

router.get('/orders', async (_req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    include: {
      branch:   { select: { name: true } },
      items:    { include: { menuItem: true } },
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

router.get('/staff', async (_req: Request, res: Response) => {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['BRANCH_MANAGER', 'CHEF', 'CASHIER', 'HQ_MANAGER'] } },
    select: {
      id: true, name: true, role: true, salary: true, isActive: true,
      branch: { select: { name: true } },
    },
  });
  res.json(staff);
});

router.patch('/staff/:id/salary', async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0', 10);
  const { salary } = req.body as { salary: number | null };

  const user = await prisma.user.update({
    where: { id },
    data: { salary },
    select: { id: true, name: true, role: true, salary: true, isActive: true, branch: { select: { name: true } } },
  });

  res.json(user);
});

router.get('/sales', async (_req: Request, res: Response) => {
  const sales = await prisma.order.groupBy({
    by: ['branchId'],
    _sum:   { total: true },
    _count: { id: true },
    where:  { status: { in: ['DONE', 'DELIVERED'] } },
  });
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));
  const result = sales.map(s => ({
    branchId:   s.branchId,
    branchName: branchMap[s.branchId] ?? 'Unknown',
    totalSales: s._sum.total ?? 0,
    orderCount: s._count.id,
  }));
  res.json(result);
});

export default router;
