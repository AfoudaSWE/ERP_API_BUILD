---
name: devops-delivery
description: Implement repository-aware DevOps, Docker, CI/CD, release, environment, migration, observability, backup, and deployment workflows. Use for pipelines, containers, infrastructure automation, releases, health checks, secrets, monitoring, rollback, dependency scanning, or operational readiness.
---

# DevOps Delivery

1. Inspect `AGENTS.md`, docs, manifests, lockfiles, pipelines, Dockerfiles, infrastructure, environments, hosting configuration, migrations, and runbooks.
2. Detect the actual CI provider, host, package manager, runtimes, Nx targets, artifacts, and release policy. Do not invent a provider.
3. Consult current official provider/tool documentation for versioned actions, images, syntax, permissions, and deprecations.
4. Design least-privilege, reproducible stages with explicit inputs, immutable artifacts, safe concurrency, caching, timeouts, and failure behavior.
5. Implement the requested change while preserving deployment contracts.
6. Validate syntax and local equivalents; run lint, typecheck, tests, builds, container checks, affected targets, and safe dry runs.
7. Report files, validation, environment assumptions, secrets required, rollout/rollback, and risks.

## Delivery controls

- Pin runtimes and trusted actions/images; use lockfile installs and minimal non-root production images.
- Never commit secrets. Use scoped stores, short-lived credentials, masked logs, protected environments, and explicit permissions.
- Separate build from deploy and promote the same immutable artifact.
- Make migrations backward-compatible, ordered, observable, and safe for rolling deploys; define rollback or roll-forward recovery.
- Add meaningful readiness/liveness checks without causing cascading failure.
- Include structured logs, metrics, traces, correlation IDs, alerts, ownership, and runbooks.
- Define backups, retention, encryption, restore drills, dependency scanning, provenance when required, and rollback.

Read [delivery-checklist.md](references/delivery-checklist.md) before production deployment or migration changes.

