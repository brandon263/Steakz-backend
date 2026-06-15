import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireRole(['ADMIN']));

router.post('/branches', async (req: Request, res: Response) => {
  const { name, address, phone } = req.body as {
    name: string; address: string; phone?: string;
  };
  if (!name || !address) {
    res.status(400).json({ error: 'name and address are required.' });
    return;
  }
  try {
    const branch = await prisma.branch.create({ data: { name, address, phone } });
    res.status(201).json(branch);
  } catch {
    res.status(409).json({ error: 'Branch name already exists.' });
  }
});

router.get('/branches', async (_req: Request, res: Response) => {
  const branches = await prisma.branch.findMany({ orderBy: { id: 'asc' } });
  res.json(branches);
});

// Branch deletion route removed per request (permanent deletes handled by admin scripts)

router.post('/users', async (req: Request, res: Response) => {
  const { name, email, password, role, branchId, salary } = req.body as {
    name: string; email: string; password: string;
    role: string; branchId?: number | string; salary?: number;
  };
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required.' });
    return;
  }

  const branchIdNumber = branchId === undefined || branchId === null || branchId === ''
    ? null
    : Number(branchId);

  if (branchIdNumber !== null && Number.isNaN(branchIdNumber)) {
    res.status(400).json({ error: 'branchId must be a valid number.' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role as any,
        branchId: branchIdNumber,
        salary: salary ?? null,
      },
    });
    res.status(201).json({ message: 'User created.', userId: user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes('email')) {
        res.status(409).json({ error: 'Email already in use.' });
        return;
      }
      if (error.code === 'P2003') {
        res.status(400).json({ error: 'Invalid branchId or related record missing.' });
        return;
      }
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ error: 'Invalid user data provided.' });
      return;
    }
    console.error('Admin user creation failed:', error);
    res.status(500).json({ error: 'Unable to create user.' });
  }
});

router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      role: true, isActive: true, branchId: true,
      branch: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

router.patch('/users/:id/role', async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  const { role, branchId } = req.body as { role: string; branchId?: number };
  const user = await prisma.user.update({
    where: { id },
    data:  { role: role as any, branchId: branchId ?? null },
  });
  res.json({ message: 'Role updated.', user });
});

router.patch('/users/:id/disable', async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  res.json({ message: 'User disabled.' });
});

router.patch('/users/:id/enable', async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');
  await prisma.user.update({ where: { id }, data: { isActive: true } });
  res.json({ message: 'User enabled.' });
});

router.delete('/users/:id', async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const idString = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idString ?? '0');

  try {
    await prisma.order.deleteMany({ where: { customerId: id } });
    await prisma.booking.deleteMany({ where: { customerId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted.' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    console.error('Admin user deletion failed:', error);
    res.status(500).json({ error: 'Unable to delete user.' });
  }
});

export default router;
