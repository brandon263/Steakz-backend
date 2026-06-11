import prisma from '../src/lib/prisma.js';

async function main() {
  const menuItems = [
    { name: 'NY Strip Steak', price: 45.99, category: 'Steaks', description: 'Premium 12oz USDA Prime NY Strip' },
    { name: 'Ribeye Steak', price: 49.99, category: 'Steaks', description: 'Rich and juicy 14oz Ribeye' },
    { name: 'Filet Mignon', price: 52.99, category: 'Steaks', description: 'Tender 8oz Filet Mignon' },
    { name: 'Caesar Salad', price: 14.99, category: 'Starters', description: 'Classic Caesar with parmesan' },
    { name: 'Garlic Bread', price: 8.99, category: 'Sides', description: 'Toasted garlic bread' },
    { name: 'Chocolate Cake', price: 10.99, category: 'Desserts', description: 'Rich chocolate layer cake' },
  ];

  for (const item of menuItems) {
    try {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          price: item.price,
          category: item.category,
          description: item.description,
          branchId: 1, // Steakz Downtown
          isAvailable: true,
        },
      });
      console.log(`✓ Created: ${item.name}`);
    } catch (err: any) {
      console.error(`Error: ${item.name} -`, err.message);
    }
  }

  console.log('✓ Done!');
}

main().catch(console.error).finally(() => process.exit(0));
