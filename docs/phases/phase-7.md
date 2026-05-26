# Phase 7 — Chaos Engineering

**Goal:** prove the platform survives the failures that actually happen in
production — pod death, slow databases, CPU saturation, partial outages —
not just the failures the test suite remembered to write.

## What shipped

| Experiment | Hypothesis | Result |
| --- | --- | --- |
| Pod kill (one backend pod) | Deployment auto-recovers, no user-visible downtime | ✅ replacement Ready in ~2s (better than the 30s budget) |
| Network delay to RDS (+500ms) | Latency rises, error rate stays near 0 | ✅ p95 spiked; zero errors |
| CPU stress (100% on every backend pod) | HPA scales 2 → 4+ replicas | ✅ HPA scaled up within ~90s |
| 50% pod failure (`pod-failure`, fixed-percent) | Site stays up on the surviving half | ✅ 20/20 curl probes returned 200 |

## Key files

- `chaos/install.sh` — Chaos Mesh on EKS containerd
- `chaos/experiments/01-pod-kill-backend.yaml`
- `chaos/experiments/02-network-delay-rds.yaml`
- `chaos/experiments/03-cpu-stress-backend.yaml`
- `chaos/experiments/04-pod-failure-50pct.yaml`
- `chaos/gameday-runbook.md` — the step-by-step drill

See the [chaos game day runbook](../chaos-gameday.md) for the live-session
script.

## Interview lesson — teardown order

After running the drills I went straight to `terraform destroy` without
deleting the Argo CD Application first. The teardown hung on a
`DependencyViolation` for the VPC for **19 minutes**.

**Root cause:** the AWS Load Balancer Controller creates an **ALB + target
groups + security groups** *outside Terraform's state*, in response to the
`Ingress` object. When you `terraform destroy` without first removing the
`Ingress`, those AWS resources are orphaned and Terraform can't delete the
VPC they live in.

**Fix:**

```bash
# Order matters
kubectl delete -f gitops/apps/shopforge.yaml         # 1. delete the app
# wait ~2 min for ALB controller to clean up
terraform destroy                                    # 2. then destroy infra
```

If you hit it: manually delete the ALB → target groups → orphaned security
groups via AWS CLI (`aws elbv2 delete-load-balancer`,
`aws elbv2 delete-target-group`, `aws ec2 delete-security-group`), then
re-run `terraform destroy`. State will sync.

This is exactly the kind of *war story* an interviewer is looking for — a
specific failure with a specific root cause and a documented fix.

## Cost

~$2 per drill session (cluster up for ~1 hour).

[:material-arrow-left: Back to phases](index.md)
