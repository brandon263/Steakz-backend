import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './middleware/logger.js';
import { seed } from './lib/seed.js';

import authRoutes          from './routes/authRoutes.js';
import adminRoutes         from './routes/adminRoutes.js';
import hqRoutes            from './routes/hqRoutes.js';
import branchManagerRoutes from './routes/branchManagerRoutes.js';
import chefRoutes          from './routes/chefRoutes.js';
import cashierRoutes       from './routes/cashierRoutes.js';
import customerRoutes      from './routes/customerRoutes.js';
import menuRoutes          from './routes/menuRoutes.js';
import publicRoutes        from './routes/publicRoutes.js';

const app  = express();
const PORT = process.env['PORT'] ?? 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env['FRONTEND_URL'],
].filter((origin): origin is string => Boolean(origin));

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(logger);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth',           authRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/hq',             hqRoutes);
app.use('/api/branch-manager', branchManagerRoutes);
app.use('/api/chef',           chefRoutes);
app.use('/api/cashier',        cashierRoutes);
app.use('/api/customer',       customerRoutes);
app.use('/api/menu',           menuRoutes);
app.use('/api/public',         publicRoutes);

app.listen(PORT, async () => {
  await seed();
  console.log(`STEAKZ API running on http://localhost:${PORT}`);
});
