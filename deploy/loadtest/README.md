# API load test (k6)

## Install

- Windows: `winget install k6 --source winget` (or `choco install k6`)
- Mac: `brew install k6`
- Or download a binary: https://github.com/grafana/k6/releases

## Run

```sh
k6 run deploy/loadtest/k6-api-load-test.js
```

Override target, credentials, or load shape with `-e`:

```sh
k6 run \
  -e BASE_URL=https://erp.malekstores.com \
  -e LOGIN_EMAIL=owner@demo.erp \
  -e LOGIN_PASSWORD=Demo1234! \
  -e VUS=50 \
  -e DURATION=2m \
  -e RAMP=30s \
  deploy/loadtest/k6-api-load-test.js
```

## What it does

Logs in **once** in `setup()` and shares that token across every virtual user for the whole run — it
never calls `/api/auth` again, because that route is rate-limited to 20 requests/15min per IP
(`apps/api/erp-api/src/app.ts`). Each VU then loops over a realistic weighted mix of read endpoints
(dashboard summary, product list, invoices, customers) with 0.5-2s think time between requests, ramping
VUs up, holding steady, then ramping down.

Fails the run (non-zero exit) if:
- more than 1% of requests error out, or
- p95 latency exceeds 800ms, or p99 exceeds 1500ms

## What's deliberately left out

- **Writes** (POS checkout, invoice creation, employee onboarding, etc.) — running those at load would
  create real test data on whatever company the login account belongs to. If you need write-path load
  testing, point `LOGIN_EMAIL`/`LOGIN_PASSWORD` at a disposable test company and add a scenario that posts
  to `/api/sales/invoices`, then clean up the created rows afterward.
- **Browser rendering** — this only exercises the API. For real page-load/JS timing, use Playwright, not k6.
- **The signup/approval flow** — also gated by the same auth rate limiter and not worth load testing;
  it's a one-time-per-company path, not a hot path.
- **TLS/CDN edge behavior** — run from a box in the same region as the VPS if you care about raw server
  latency instead of network noise.

There's also a much lighter existing smoke check at `deploy/load-gate.mjs`, used in the release gate —
that one just hammers `/api/products` with plain `fetch()` and fails the build if p95 > 1000ms or error
rate > 1%. Use k6 here when you want a real load test with ramping and multiple endpoints; use the gate
script for a fast CI sanity check.
