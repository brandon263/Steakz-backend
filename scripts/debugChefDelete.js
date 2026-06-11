const fetch = require('node-fetch');
const prisma = require('../src/lib/prisma.js').default;
const jwt = require('jsonwebtoken');

(async () => {
  try {
    const chef = await prisma.user.findFirst({ where: { role: 'CHEF', isActive: true, branchId: { not: null } } });
    console.log('chef', chef ? chef.email : 'none');
    if (!chef) return;

    const token = jwt.sign({ id: chef.id, role: chef.role, branchId: chef.branchId }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });
    console.log('token', token.slice(0, 20) + '...');

    const menuRes = await fetch('http://127.0.0.1:4174/api/chef/menu', { headers: { Authorization: 'Bearer ' + token } });
    console.log('menu status', menuRes.status);
    const menuData = await menuRes.text();
    console.log(menuData);
    if (menuRes.status === 200) {
      const items = JSON.parse(menuData);
      if (items.length > 0) {
        const id = items[0].id;
        console.log('attempt delete id', id);
        const delRes = await fetch('http://127.0.0.1:4174/api/chef/menu/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        console.log('delete status', delRes.status);
        console.log(await delRes.text());
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
