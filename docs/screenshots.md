# Screenshots gallery

The visual artefacts captured during live runs.

!!! note "How this page works"

    Screenshots are added incrementally. Each section below describes
    *what* was captured; when the PNG is committed to `docs/images/`, swap
    the placeholder line for `![caption](images/<file>.png)`.

## Phase 5 — App live behind the ALB

**What:** the React storefront served from EKS, fronted by an AWS ALB
created by the LB Controller in response to the Ingress object.

> 📷 `docs/images/05-storefront.png` — *to be committed*

## Phase 6 — RED dashboard at baseline

**What:** steady ~2 req/s background load on the Grafana RED dashboard:
0% errors, low latency. The reference shape that every chaos drill is
measured against.

> 📷 `docs/images/06-red-baseline.png` — *to be committed*

## Phase 7 — Chaos experiments

### Experiment 1: pod kill

**What:** kubectl pane shows a backend pod terminate and a replacement
reach Ready in ~2 seconds. Dashboard shows a brief request-rate dip and
clean recovery, error rate stays at 0%.

> 📷 `docs/images/07-exp1-pod-kill.png` — *captured locally, pending commit*

### Experiment 2: network delay to RDS

**What:** p95 latency jumps from ~50 ms to ~600 ms during the 3-minute
delay, then snaps back to baseline within seconds of removal. Error rate
stays at zero throughout — backend's connection pool absorbed the slow
database without failing.

> 📷 `docs/images/07-exp2-network-delay.png` — *captured locally, pending commit*

### Experiment 3: CPU stress → HPA scale-up

**What:** sustained 100% CPU on every backend pod. HPA `TARGETS` column
climbs to 100%+, then `REPLICAS` ticks from 2 → 3 → 4 within ~90 seconds
of the stressor going live.

> 📷 `docs/images/07-exp3-cpu-stress.png` — *captured locally, pending commit*

### Experiment 4: 50% pod failure

**What:** half the backend pods rendered unschedulable. A 20-iteration
curl loop against the ALB returns HTTP 200 on every probe — surviving
pods carried the full load.

> 📷 `docs/images/07-exp4-pod-failure.png` — *captured locally, pending commit*

## Phase 8 — Load test under k6

**What:** k6 ramp from 20 → 100 VUs alongside the Grafana RED dashboard.
HPA scales backend from 2 → 4 replicas during the peak stage; request
rate climbs to ~100 req/s; error rate stays at 0%; p95 latency rises
briefly during scale-up and settles.

> 📷 `docs/images/08-k6-hpa.png` — *to be captured on the live run*

> 📷 `docs/images/08-grafana-loaded.png` — *to be captured on the live run*

## Argo CD app tree

**What:** the app-of-apps tree as Argo CD reconciles `gitops/` manifests
into the cluster. `shopforge` Application shows `Synced` and `Healthy`.

> 📷 `docs/images/argocd-tree.png` — *to be captured next live run*

---

## How to add a screenshot

```bash
# 1. Drop the PNG into docs/images/
cp ~/Pictures/my-screenshot.png docs/images/07-exp1-pod-kill.png

# 2. In this file, replace the corresponding placeholder line with a
#    standard markdown image tag pointing at images/<file>.png

# 3. Preview locally
mkdocs serve

# 4. Commit
git add docs/images/07-exp1-pod-kill.png docs/screenshots.md
git commit -m "docs: add pod-kill screenshot"
```
