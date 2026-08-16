# Linux VPS deployment

## Prerequisites

- Ubuntu 24.04 LTS or another supported Linux distribution, Docker Engine with Compose v2, a DNS A/AAAA record, and inbound ports 80/443 only.
- At least 2 vCPU, 4 GB RAM, 40 GB SSD for a small installation. Monitor before scaling.
- Off-host encrypted backup storage. A backup on the same VPS is not disaster recovery.

## First deployment

1. Copy `.env.production.example` to `.env.production`, replace every placeholder with independently generated secrets, and set restrictive permissions: `chmod 600 .env.production`.
2. Run `deploy/release-gate.sh`. The release scope is the ERP API, jobs worker, owned job/commerce libraries, PostgreSQL, and Redis. The experimental vision, automation, and retail applications are separate deployments.
3. Validate configuration without starting services: `docker compose --env-file .env.production -f compose.production.yml config --quiet`.
4. Build immutable images: `docker compose --env-file .env.production -f compose.production.yml build --pull`.
5. Start the database and Redis, then run the one-shot migration: `docker compose --env-file .env.production -f compose.production.yml up -d postgres redis` followed by `docker compose --env-file .env.production -f compose.production.yml run --rm migrate`.
6. Start the application: `docker compose --env-file .env.production -f compose.production.yml up -d api worker web caddy`.
7. Run `BASE_URL=https://your-domain.example deploy/smoke.sh` and inspect JSON logs.

PostgreSQL and Redis have no host ports in the production topology. Caddy terminates TLS and is the only public service. Restrict SSH by key, disable password login, enable unattended security upgrades, and enforce a host firewall.

## Updates and rollback

Create and verify a backup before migration. Build the new revision, run its migration job once, then recreate API and worker. Database migrations must remain backward compatible during a rolling update. Roll back application images to a previously tagged revision; restore a database only after an explicit incident decision because restoration discards newer writes.

## Backups

Set `BACKUP_DIR` to an encrypted/off-host mounted destination and run `deploy/backup.sh` on a timer. Retain daily, weekly, and monthly generations appropriate to the business. Run `deploy/restore-rehearsal.sh <dump>` regularly; a successful `pg_dump` alone is not proof of recoverability.

## Monitoring

Alert on `/api/ready`, restart loops, HTTP 5xx rate, latency percentiles, disk usage, PostgreSQL connections/locks/replication or backup age, Redis memory/evictions, and BullMQ failed or delayed jobs. Forward container JSON logs off-host and redact secrets at the collector.
