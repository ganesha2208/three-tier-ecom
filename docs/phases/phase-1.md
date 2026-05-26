# Phase 1 — Identity Service Extraction

**Goal:** extract the authentication / user domain out of the monolith into
its own service, as the first step of a microservices story.

## What shipped

- `services/identity-service/` — independent FastAPI service with its own
  `pyproject.toml`, Dockerfile, Alembic migrations, and `tests/`
- Schema-per-service pattern: `identity` schema, owned solely by this
  service
- `/health` (liveness) and `/ready` (readiness — checks DB) endpoints
- OpenAPI spec generated and committed

## Why this scope

The original 6-phase plan called for splitting into 5 services. After
identity-service was working end-to-end, the scope was deliberately
re-cut: continuing the split would have spent the remaining budget on
*refactoring* instead of on the DevOps deliverables (Phases 4–8) that
recruiters actually evaluate. Identity is the proof that the pattern
works; the same shape would apply to catalog / order / payment in a
production setting.

This is an explicit, defensible cut — see
[Architecture / What was cut](../architecture.md#what-was-cut-and-why).

## Cost

$0 — local dev only.

[:material-arrow-left: Back to phases](index.md)
