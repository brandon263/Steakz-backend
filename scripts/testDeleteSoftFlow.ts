async function fetchJson(path: string, opts: any = {}) {
  const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174/api';
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } catch { return { status: res.status, data: text }; }
}

async function main() {
  const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174/api';
  console.log('Using BASE_URL =', BASE);
  const managerEmail = 'manager@steakz.com';
  const managerPass = 'manager123';
  const login = await fetchJson('/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: managerEmail, password: managerPass }) });
  if (login.status !== 200) throw new Error('Login failed');
  const token = login.data.token;
  const id = parseInt(process.argv[2] ?? '17', 10);
  const del = await fetchJson(`/menu/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  console.log('Delete response:', del.status, del.data);
}

await main();
