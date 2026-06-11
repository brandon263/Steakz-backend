import prisma from '../src/lib/prisma.js';

async function main() {
  const targetName = 'Steakz';

  const exact = await prisma.branch.findMany({ where: { name: targetName } });
  if (exact.length > 0) {
    console.log(`Found ${exact.length} exact match(es) for "${targetName}":`, exact.map(b => b.name));
    for (const b of exact) {
      console.log('Deleting branch id', b.id, 'name', b.name);
      await prisma.branch.delete({ where: { id: b.id } });
    }
    console.log('Deleted exact matches.');
    process.exit(0);
  }

  const candidates = await prisma.branch.findMany({ where: { name: { contains: 'Steakz' } } });
  if (candidates.length === 0) {
    console.log('No branch found named or containing "Steakz". Nothing deleted.');
    process.exit(0);
  }

  if (candidates.length === 1) {
    const b = candidates[0];
    console.log('No exact match; one candidate found:', b.name, '— deleting it.');
    await prisma.branch.delete({ where: { id: b.id } });
    console.log('Deleted candidate.');
    process.exit(0);
  }

  console.log('Multiple candidate branches found containing "Steakz":');
  for (const b of candidates) console.log('-', b.id, b.name);
  console.log('Aborting to avoid accidental deletion. If you want to delete one of these, run a targeted script.');
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(2); });
