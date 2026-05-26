# Phase 6 — Observability (Prometheus + Loki + Grafana)

**Goal:** when something goes wrong, see it on a dashboard *before* a user
reports it. RED metrics on every request, structured logs queryable in
seconds, Grafana panels driven by real PromQL.

## What shipped

- `observability/install.sh` — installs `kube-prometheus-stack` + Loki
  via Helm
- `observability/servicemonitor.yaml` — Prometheus scrapes
  `backend:/metrics`
- Backend instrumented with `prometheus-client` directly (avoids
  `prometheus-fastapi-instrumentator`'s starlette version conflict)
- `structlog` JSON output → Loki via Promtail
- `observability/dashboards/shopforge-backend.json` — RED dashboard:
  request rate, error rate, latency p50/p95/p99 per route
- `observability/alerts.yaml` — Alertmanager rules: high error rate, high
  p95 latency, pod crashloop

## Key files

- `backend/app/observability/metrics.py` — counters, histograms, /metrics endpoint
- `observability/dashboards/shopforge-backend.json`
- `observability/kube-prometheus-stack-values.yaml`

## The dashboard

The RED panel set: **Rate** (requests/sec by route), **Errors** (5xx rate),
**Duration** (latency p95). A single screen that answers *"is the API
healthy right now?"* — and the same screen is what the chaos drills
([Phase 7](phase-7.md)) prove against.

## Bumps along the way

- **`prometheus-fastapi-instrumentator` ↔ starlette<1.0 conflict** — pinned
  pip versions disagreed. Solution: drop the instrumentator and use
  `prometheus-client` directly with a `/metrics` route. Honest fix, less
  magic.
- **Grafana dashboard variable unresolved** — `$datasource` didn't substitute;
  fixed by using the default datasource reference.

## Cost

Marginal — runs on the existing EKS nodes; no extra AWS resources.

[:material-arrow-left: Back to phases](index.md)
