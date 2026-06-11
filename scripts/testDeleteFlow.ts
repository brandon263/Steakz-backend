import { execSync } from 'child_process';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174/api';

async function fetchJson(path: string, opts: any = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}

async function ensureUser(email: string, password: string, createScript?: string) {
  const r = await fetchJson('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (r.status === 200 && r.data?.token) return r.data.token;
  if (createScript) {
    console.log(`Running ${createScript} to create ${email}`);
    execSync(`npx tsx ${createScript}`, { stdio: 'inherit' });
    const r2 = await fetchJson('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (r2.status === 200 && r2.data?.token) return r2.data.token;
  }
  throw new Error(`Unable to ensure user ${email}`);
}

async function main() {
  try {
    const managerToken = await ensureUser('manager@steakz.com', 'manager123', 'scripts/createManager.ts');
    console.log('Manager token acquired');

    // Create menu item as manager
    const create = await fetchJson('/menu', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${managerToken}` }, body: JSON.stringify({ name: 'Test Delete Item', price: 9.99, category: 'Mains' }) });
    console.log('Create response:', create.status, create.data);
    const id = create.data?.id;
    if (!id) throw new Error('Failed to create menu item');

    const chefToken = await ensureUser('chef1@steakz.com', 'chef123', 'scripts/createChefBranch1.ts');
    console.log('Chef token acquired');

    // Chef deletes the item
    const del = await fetchJson(`/chef/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${chefToken}` } });
    console.log('Chef delete response:', del.status, del.data);

    // Manager view
    const menu = await fetchJson('/branch-manager/menu', { method: 'GET', headers: { Authorization: `Bearer ${managerToken}` } });
    console.log('Branch-manager menu length:', Array.isArray(menu.data) ? menu.data.length : 'not-array');
    console.log('Menu items:', menu.data);
  } catch (err: any) {
    console.error('Test failed:', err.message || err);
    process.exit(1);
  }
}

await main();
