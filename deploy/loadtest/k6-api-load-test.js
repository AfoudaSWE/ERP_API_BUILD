// k6 load test for the ERP API.
//
// Install k6: https://k6.io/docs/get-started/installation/
// Run:
//   k6 run deploy/loadtest/k6-api-load-test.js
//
// Override target/credentials/shape via env vars, e.g.:
//   k6 run -e BASE_URL=https://erp.malekstores.com -e VUS=50 -e DURATION=2m deploy/loadtest/k6-api-load-test.js
//
// IMPORTANT: /api/auth is rate-limited to 20 requests/15min per IP (see apps/api/erp-api/src/app.ts).
// This script logs in exactly ONCE in setup() and shares the token across every VU — it never calls
// /api/auth again during the run. Do not add per-VU logins or you will trip the limiter instantly.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'https://erp.malekstores.com').replace(/\/$/, '');
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'owner@demo.erp';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'Demo1234!';
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '1m';
const RAMP = __ENV.RAMP || '30s';

const errorRate = new Rate('erp_errors');
const dashboardTrend = new Trend('erp_dashboard_summary_duration');
const productsTrend = new Trend('erp_products_list_duration');
const invoicesTrend = new Trend('erp_sales_invoices_duration');
const customersTrend = new Trend('erp_customers_duration');

export const options = {
  stages: [
    { duration: RAMP, target: VUS },
    { duration: DURATION, target: VUS },
    { duration: RAMP, target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    erp_errors: ['rate<0.01'],
  },
};

export function setup() {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} ${response.body}`);
  }
  const accessToken = response.json('data.accessToken');
  return { accessToken };
}

// Weighted mix of read endpoints that a real session hits most: dashboard on
// every page load, product/customer lookups constantly, invoices less often.
const SCENARIOS = [
  { weight: 30, name: 'dashboard summary', path: '/api/dashboard/summary', trend: dashboardTrend },
  { weight: 35, name: 'products list', path: '/api/products?page=1&pageSize=20', trend: productsTrend },
  { weight: 20, name: 'sales invoices', path: '/api/sales/invoices', trend: invoicesTrend },
  { weight: 15, name: 'customers list', path: '/api/customers?page=1&pageSize=20', trend: customersTrend },
];
const TOTAL_WEIGHT = SCENARIOS.reduce((sum, s) => sum + s.weight, 0);

function pickScenario() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const scenario of SCENARIOS) {
    roll -= scenario.weight;
    if (roll <= 0) return scenario;
  }
  return SCENARIOS[SCENARIOS.length - 1];
}

export default function (data) {
  const scenario = pickScenario();
  const response = http.get(`${BASE_URL}${scenario.path}`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
    tags: { name: scenario.name },
  });
  const ok = check(response, {
    [`${scenario.name}: status is 200`]: (r) => r.status === 200,
  });
  errorRate.add(!ok);
  scenario.trend.add(response.timings.duration);
  sleep(Math.random() * 1.5 + 0.5); // 0.5-2s think time, like a real user
}

export function handleSummary(data) {
  return { stdout: JSON.stringify(data.metrics, null, 2) };
}
