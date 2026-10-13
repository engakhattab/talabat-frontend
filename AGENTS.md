# Agent Context

Full project context (workspace map, rules, commands, gotchas, current status) lives in `CLAUDE.md`. Read it first.
The binding rules are in `.specify/memory/constitution.md` (v1.1.0); when anything conflicts, the constitution wins.

<!-- SPECKIT START -->
Current roadmap increment:

- Phase: **Phase 11 — customer release hardening** (`specs/005-release-hardening`), committed. Open tasks: T036 manual
  address acceptance, T038 runbook finalization, T039 the ordered release gate.
- Branch: `master` (default). Start new work on a task branch from `master` and open a PR back into it.
- Next candidate: Delivery application, per `docs/talabat-delivery-frontend-roadmap.md` (backend blockers resolved;
  the constitution's Scope Guard still lists it as deferred, so confirm with the user before starting).

Key guardrails: the backend is authoritative; all HTTP goes through generated `api-*` clients (never hand-edited);
tokens stay in memory; only one phase at a time, from a clean baseline; contract regeneration is committed separately
from feature code.
<!-- SPECKIT END -->
