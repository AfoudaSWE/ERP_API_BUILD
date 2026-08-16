const baseUrl = process.env.BASE_URL ?? 'http://api:3333';
const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@demo.erp', password: 'Demo1234!' }) });
if (!login.ok) throw new Error(`login: ${login.status}`);
const { data } = await login.json();
const queued = await fetch(`${baseUrl}/api/jobs/inventory/check-low-stock`, { method: 'POST', headers: { authorization: `Bearer ${data.accessToken}` } });
if (queued.status !== 202) throw new Error(`queue: ${queued.status}`);
const body = await queued.json();
console.log(JSON.stringify(body.data));
