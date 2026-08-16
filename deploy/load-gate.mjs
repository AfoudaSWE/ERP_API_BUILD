const baseUrl = process.env.BASE_URL ?? 'http://api:3333';
const requests = Number(process.env.LOAD_REQUESTS ?? 500);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 25);
const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.LOAD_EMAIL ?? 'owner@demo.erp', password: process.env.LOAD_PASSWORD ?? 'Demo1234!' }),
});
if (!login.ok) throw new Error(`Login failed with ${login.status}`);
const { data } = await login.json();
let cursor = 0; let failures = 0; const durations = [];
async function runner() {
  while (true) {
    const index = cursor++; if (index >= requests) return;
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/products?page=1&pageSize=20`, { headers: { authorization: `Bearer ${data.accessToken}` } });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch { failures += 1; }
    durations.push(performance.now() - started);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => runner()));
durations.sort((a, b) => a - b);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.floor(durations.length * value))];
const result = { requests, concurrency, failures, errorRate: failures / requests, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), p99Ms: Math.round(percentile(0.99)) };
console.log(JSON.stringify(result));
if (result.errorRate > 0.01 || result.p95Ms > 1000) process.exitCode = 1;
