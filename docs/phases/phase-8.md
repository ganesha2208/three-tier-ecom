# Phase 8 — DR, Load Test, Docs

**Goal:** close the portfolio with the three artefacts that turn a "cool
project" into a "production-thinking engineer" — a real DR runbook, a real
load test, and a real docs site.

## What shipped

- **[DR runbook](../dr-runbook.md)** — RDS PITR + snapshot restore
  procedure, recovery objective table (RPO ≤ 5 min, RTO ≤ 30 min),
  region-failover theory
- **[k6 load test](../load-test.md)** — `loadtest/k6-checkout.js` ramps to
  100 concurrent users against the live ALB. **Live run on 27 May 2026
  passed all thresholds** (p95 = 34.93 ms, error rate = 0 %, 52,942
  requests total). Backend HPA scaled 2 → 4 (its configured max) during
  the peak; CPU exceeded the 70 % target — the HPA ceiling, not the app,
  was the first limit hit. See the [load-test page](../load-test.md) for
  screenshots and the follow-up plan.
- **MkDocs Material site** (this site) — auto-deployed to GitHub Pages from
  `main` via `.github/workflows/docs.yml`
- **[Demo script](../demo-script.md)** — 3–5 minute walkthrough beats and
  voiceover
- **README polish** — top-level repo README revamped with badges,
  architecture hero, and recruiter-targeted "what this demonstrates"
  bullets

## Key files

- `mkdocs.yml`
- `docs/` (this directory tree)
- `loadtest/k6-checkout.js`
- `.github/workflows/docs.yml`

## Cost

~$1–2 for the live k6 run on a spun-up cluster. Documentation is local
work.

[:material-arrow-left: Back to phases](index.md)
