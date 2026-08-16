---
name: architecture-engineering
description: Design and implement system and software architecture for applications, services, and platforms. Use for architecture decisions, module or service boundaries, scalability, resilience, data ownership, integration patterns, ADRs, major refactors, or cross-cutting technical design; combine with relevant technology and domain skills.
---

# Architecture Engineering

1. Inspect the repository, `AGENTS.md`, documentation, manifests, dependency graph, deployment files, tests, and conventions.
2. Confirm requirements, constraints, quality attributes, data sensitivity, failure modes, and backward compatibility from evidence. State material assumptions.
3. Check current official documentation for version-sensitive APIs, frameworks, services, and standards.
4. Map the current architecture and choose the smallest coherent change. Preserve boundaries unless evidence justifies changing them.
5. Implement the requested work and record consequential decisions in the repository's ADR format when one exists.
6. Run relevant lint, typecheck, tests, build, integration checks, and Nx affected commands.
7. Report files, validation, decisions, assumptions, compatibility impact, and remaining risks.

## Design rules

- Start with modular monolith boundaries unless independent deployment, scaling, ownership, isolation, or reliability needs justify distributed services.
- Assign clear ownership for data and behavior. Avoid shared databases across independently deployed services and generic shared modules without an owner.
- Apply SOLID and dependency inversion where they improve changeability or testing; avoid abstractions and layers without demonstrated value.
- Define contracts, consistency, idempotency, timeouts, retries, backpressure, and failure recovery.
- Address authentication, authorization, least privilege, tenant isolation, secrets, encryption, auditability, privacy, and dependency risk.
- Address capacity, latency, caching, concurrency, observability, migration, rollback, backups, and disaster recovery.
- Preserve APIs, schemas, events, configuration, and data compatibility unless a breaking change is explicitly approved and migrated.

Read [architecture-checklist.md](references/architecture-checklist.md) for a new boundary, distributed workflow, major refactor, or architecture decision.

