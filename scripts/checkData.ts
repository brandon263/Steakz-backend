import prisma from '../src/lib/prisma.js';

async function main() {
  const allBranches = await prisma.branch.findMany();
  console.log('All branches:', allBranches);

  const manager = await prisma.user.findUnique({
    where: { email: 'managerdowntown@steakz.com' },
  });
  console.log('Branch Manager:', manager);
}

main().catch(console.error).finally(() => process.exit(0));
