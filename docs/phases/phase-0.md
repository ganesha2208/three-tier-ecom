# Phase 0 — App Hardening

**Goal:** stabilise the monolith before slicing or shipping it. A buggy
app, deployed to Kubernetes, is just a bug at higher operational cost.

## What shipped

- Multi-stage `frontend/Dockerfile` (no dev server in "prod")
- `SECRET_KEY` must come from env — fail-fast at startup
- Transactional stock decrement using `SELECT ... FOR UPDATE`
- CORS origins enforced (no `["*"]` fallback)
- Health (`/health`) and readiness (`/ready`) endpoints
- Structured JSON logging via `structlog`
- Idempotency-key support on order create

## Key files

- `backend/app/main.py` — app entrypoint + health endpoints
- `backend/app/core/config.py` — required-env validation
- `backend/app/services/order_service.py` — transactional stock

## Why it matters

Every later phase assumes the app behaves. The orchestration around a flaky
binary still produces a flaky service — Kubernetes won't fix a deadlock.

## Cost

$0 — all changes are local.

[:material-arrow-left: Back to phases](index.md)
