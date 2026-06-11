import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret';

async function main() {
  const email = 'manager@steakz.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Manager already exists, id=', existing.id);
    const token = jwt.sign({ id: existing.id, role: existing.role, branchId: existing.branchId }, JWT_SECRET, { expiresIn: '7d' });
    console.log('TOKEN', token);
    return;
  }
  const password = await bcrypt.hash('manager123', 10);
  // attach to first branch
  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branch present');
  const user = await prisma.user.create({ data: { name: 'Branch Manager', email, password, role: 'BRANCH_MANAGER', branchId: branch.id } });
  const token = jwt.sign({ id: user.id, role: user.role, branchId: user.branchId }, JWT_SECRET, { expiresIn: '7d' });
  console.log('Created manager id=', user.id);
  console.log('TOKEN', token);
}

main().catch(e=>{console.error(e); process.exit(1)}).finally(async ()=>{await prisma.$disconnect()});
