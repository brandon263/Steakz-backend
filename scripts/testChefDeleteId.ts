async function fetchJson(path: string, opts: any = {}) {
  const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174/api';
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}

async function main() {
  const chefEmail = 'chef1@steakz.com';
  const chefPass = 'chef123';
  const login = await fetchJson('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: chefEmail, password: chefPass }) });
  if (login.status !== 200) throw new Error('Login failed');
  const token = login.data.token;
  const id = parseInt(process.argv[2] ?? '17', 10);
  const del = await fetchJson(`/chef/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  console.log('Chef delete response:', del.status, del.data);
}

await main();
