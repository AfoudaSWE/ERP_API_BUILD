const baseUrl = process.env.BASE_URL ?? 'http://api:3333';
async function post(path, body) {
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
const login = await post('/api/auth/login', { email: process.env.LOAD_EMAIL ?? 'owner@demo.erp', password: process.env.LOAD_PASSWORD ?? 'Demo1234!' });
if (!login.ok) throw new Error(`login: ${login.status}`);
const first = (await login.json()).data;
const rotation = await post('/api/auth/refresh', { refreshToken: first.refreshToken });
if (!rotation.ok) throw new Error(`rotation: ${rotation.status}`);
const second = (await rotation.json()).data;
const replay = await post('/api/auth/refresh', { refreshToken: first.refreshToken });
if (replay.status !== 401) throw new Error(`replay was not rejected: ${replay.status}`);
const logout = await post('/api/auth/logout', { refreshToken: second.refreshToken });
if (logout.status !== 204) throw new Error(`logout: ${logout.status}`);
const afterLogout = await post('/api/auth/refresh', { refreshToken: second.refreshToken });
if (afterLogout.status !== 401) throw new Error(`revoked token was not rejected: ${afterLogout.status}`);
console.log(JSON.stringify({ login: login.status, rotation: rotation.status, replay: replay.status, logout: logout.status, afterLogout: afterLogout.status }));
