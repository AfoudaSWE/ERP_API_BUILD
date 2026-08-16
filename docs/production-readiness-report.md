# ERP backend production-readiness report

Date: 2026-08-14

## Verdict

Approved for deployment of the defined ERP scope: ERP API, jobs worker, owned job/commerce libraries, PostgreSQL, Redis, and Caddy. Approval is conditional on real secrets, DNS, firewalling, off-host backups, and a passing `deploy/release-gate.sh` on the exact revision. Vision, automation, and the separate retail application are not part of this deployment approval.

## Architecture and integrity

PostgreSQL is the system of record. Sales, inventory, purchasing, finance, audit, and document numbering use atomic database transactions and row locking. A parallel final-stock test proves that one of two competing sales succeeds while the other receives `INSUFFICIENT_STOCK`, leaving stock at zero.

Job requests commit to a PostgreSQL outbox. The worker relays them to BullMQ using row locks, bounded retries, stale-claim recovery, and deterministic job IDs. An end-to-end gate verified that an API request advanced to `published`.

Tenant identity is explicit when an email is shared, permissions are reloaded from PostgreSQL, and company/branch isolation tests pass. Refresh tokens rotate atomically; replay revokes the family, logout revokes the token, and refresh checks the current active user and permissions.

## Production controls

- Startup rejects missing database/JWT settings, placeholder secrets, wildcard CORS, and non-HTTPS production origins.
- Authentication rate limits, request/header deadlines, database pool/connect/idle/statement limits, and graceful drain deadlines are bounded.
- Liveness and database-backed readiness are separate.
- Migrations use a PostgreSQL advisory lock.
- API and worker run non-root with read-only filesystems and no-new-privileges.
- PostgreSQL and authenticated Redis are private; Caddy provides TLS and security headers.
- Logs rotate; backup, restore, smoke, load, and release-gate procedures are included.

## Verification evidence

- Uncached typecheck: 18/18 TypeScript projects passed.
- ERP release lint scope: passed. Unrelated experimental vision, automation, and retail projects retain their own lint debt and are excluded from this deployment.
- Production dependency audit: zero known vulnerabilities.
- ERP release suite in an isolated seeded Linux stack: passed, including all 58 original ERP API tests plus the parallel stock race, worker, job, and commerce tests.
- Clean migration: 23 migration records and 61 ERP tables; repeat execution was idempotent.
- Container build/startup/readiness: passed for API, worker, PostgreSQL, and Redis.
- Auth gate: login 200, rotation 200, old-token replay 401, logout 204, post-logout refresh 401.
- Authenticated load gate: 500 requests at concurrency 25, zero failures, p50 70 ms, p95 120 ms, p99 167 ms on the development host. This is a regression baseline, not a universal VPS capacity guarantee.
- Backup restoration: custom-format dump restored into a new database and verified at 23 migrations, 27 users, 6 products, and 6 inventory balances; the temporary restore database was removed.

## Ongoing gates

1. Pass `deploy/release-gate.sh` for each immutable revision and retain its logs.
2. Run a longer production-equivalent soak before materially increasing traffic; alert on latency, errors, database saturation, Redis memory, and queue lag.
3. Keep encrypted backups off-host and perform scheduled restore drills comparing representative accounting and inventory totals.
4. Give vision, automation, and retail independent green release gates before deploying them.
