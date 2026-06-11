import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

const BRANCHES = [
  { name: 'Steakz Downtown',  address: '100 Main Boulevard, Downtown District', phone: '+44 20 1234 5678', openTimes: 'Mon-Sun: 11am – 11pm' },
  { name: 'Steakz Harbor',    address: '25 Pier Drive, Harbor District',            phone: '+44 20 1234 5679', openTimes: 'Mon-Sun: 12pm – 10:30pm' },
  // Steakz City Centre and Steakz Northside removed per request
  { name: 'Steakz Uptown',    address: '77 Luxury Avenue, Uptown',                 phone: '+44 20 1234 5680', openTimes: 'Mon-Fri: 12pm – 11pm, Sat-Sun: 10am – 11pm' },
  { name: 'Steakz Garden',    address: '12 Park Lane, Garden City',                phone: '+44 20 1234 5681', openTimes: 'Mon-Sun: 11am – 10pm' },
  { name: 'Steakz Riverside', address: '8 Riverwalk, Riverside Quarter',         phone: '+44 20 1234 5682', openTimes: 'Mon-Thu: 12pm – 10pm, Fri-Sun: 12pm – 11pm' },
  { name: 'Steakz Plaza',    address: '44 Central Square, Plaza District',        phone: '+44 20 1234 5683', openTimes: 'Mon-Sun: 11am – 11pm' },
  { name: 'Steakz Airport',   address: '101 Terminal Road, Airport Zone',         phone: '+44 20 1234 5684', openTimes: 'Mon-Sun: 10am – 10pm' },
  // Steakz Southgate, Steakz East Quarter, Steakz Westfield and Steakz Marina Bay removed per request
];

export async function seed() {
  const email    = process.env['ADMIN_EMAIL']    ?? 'admin@steakz.com';
  const password = process.env['ADMIN_PASSWORD'] ?? 'admin123';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name: 'System Admin', email, password: hashed, role: 'ADMIN' },
    });
    console.log(`[Seeder] Admin created: ${email}`);
  } else {
    console.log('[Seeder] Admin already exists — skipping.');
  }

  for (const b of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where: { name: b.name },
      update: { address: b.address, phone: (b as any).phone ?? null, openTimes: (b as any).openTimes ?? null, isActive: true },
      create: { name: b.name, address: b.address, phone: (b as any).phone ?? null, openTimes: (b as any).openTimes ?? null },
    });
    console.log(`[Seeder] Branch upserted: ${b.name}`);

    // Ensure each branch has a set of default tables for booking functionality
    const tableCount = await prisma.table.count({ where: { branchId: branch.id } });
    if (tableCount === 0) {
      const defaultTables = [] as any[];
      // Create 10 tables with varying capacities
      for (let i = 1; i <= 10; i++) {
        const capacity = i <= 2 ? 2 : i <= 6 ? 4 : 6;
        defaultTables.push({ tableNumber: i, capacity, branchId: branch.id });
      }
      for (const t of defaultTables) {
        try {
          await prisma.table.create({ data: t });
        } catch (err: any) {
          // ignore duplicates or errors
        }
      }
      console.log(`[Seeder] Created ${defaultTables.length} tables for ${b.name}`);
    }
  }
}
