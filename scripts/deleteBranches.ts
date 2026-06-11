import prisma from '../src/lib/prisma';

const namesToDelete = [
  'Steakz City Centre',
  'Steakz Northside',
  'Steakz Southgate',
  'Steakz East Quarter',
  'Steakz Westfield',
  'Steakz Marina Bay',
];

async function main() {
  for (const name of namesToDelete) {
    const branch = await prisma.branch.findUnique({ where: { name } });
    if (!branch) {
      console.log(`[Skip] Not found: ${name}`);
      continue;
    }
    await prisma.branch.delete({ where: { id: branch.id } });
    console.log(`[Deleted] ${name} (id=${branch.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
