# Phase 7 — Chaos Engineering

Inject controlled failures into the live ShopForge cluster, watch how
the system reacts on the Phase 6 RED dashboard, and prove the platform
is resilient to the failure modes a real production system actually
encounters: pod crashes, slow databases, CPU saturation, and partial
outages.

## Why chaos engineering matters

Tests prove the code works *under the conditions you remembered to
test*. Chaos engineering proves the system stays up under the
conditions you didn't — the kinds of failures that show up at 3am in
production: a node disappears, a network path slows down, a dependency
gets briefly overloaded.

For ShopForge the goal isn't "break things for fun" — every experiment
has a written hypothesis ("the site stays up when X") and a clear
pass/fail criterion on the Grafana dashboard. If a hypothesis is
falsified, we have a real reliability bug to fix.

## What's in here

| File | Purpose |
| --- | --- |
| `install.sh` | Idempotent install of Chaos Mesh (control plane + dashboard) |
| `experiments/01-pod-kill-backend.yaml` | Kill one random backend pod |
| `experiments/02-network-delay-rds.yaml` | Add 500ms latency on every RDS call |
| `experiments/03-cpu-stress-backend.yaml` | Peg backend CPU at 100% to trigger HPA |
| `experiments/04-pod-failure-50pct.yaml` | Take half the backend pods offline |
| `gameday-runbook.md` | Step-by-step live drill — pre-flight, each experiment, screenshots, recovery |

## The four experiments at a glance

| # | Experiment | Hypothesis | Pass criterion |
| --- | --- | --- | --- |
| 1 | Pod kill | Deployment auto-recovers; no user-visible downtime | New pod Ready in <30s, error rate stays near 0% |
| 2 | Network delay (RDS) | Backend tolerates a slow database | Latency p95 rises, error rate stays near 0% |
| 3 | CPU stress | HPA scales backend up under load | Replicas climb from 2 → 4+ within ~2 min |
| 4 | 50% pod failure | Site stays up with half the pods serving | 20/20 curl checks return 200 during the outage |

## How to run (one-time)

After `terraform apply` + `gitops/bootstrap.sh` + `observability/install.sh`:

```bash
chmod +x chaos/install.sh
./chaos/install.sh
```

Then follow [`gameday-runbook.md`](gameday-runbook.md) end to end —
~30 minutes for the full drill.

## Teardown

Chaos Mesh is part of the cluster — when you `terraform destroy` the
cluster, it goes with it. To uninstall *without* destroying the cluster:

```bash
helm -n chaos-mesh uninstall chaos-mesh
kubectl delete namespace chaos-mesh
```
