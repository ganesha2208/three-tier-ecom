# Phase 5 — EKS Bootstrap + GitOps

**Goal:** turn an empty cluster into a live, internet-reachable app
managed entirely by Argo CD.

## What shipped

- `gitops/bootstrap.sh` — idempotent install of:
  - AWS Load Balancer Controller (with IRSA)
  - Argo CD (server-side apply to handle the large CRDs)
  - The `shopforge` Argo CD Application (app-of-apps pattern)
- `gitops/apps/shopforge.yaml` — Argo CD `Application` pointing at
  `k8s/shopforge/` in this repo
- `k8s/shopforge/` — Deployments for backend + frontend, Service,
  Ingress (ALB), HPA, ConfigMaps, Secrets
- HPA on backend: 2–10 replicas, target CPU 70%

## Key files

- `gitops/bootstrap.sh`
- `gitops/apps/shopforge.yaml`
- `k8s/shopforge/backend-deployment.yaml`
- `k8s/shopforge/ingress.yaml`

## How a deploy works

1. CI builds and pushes new images to ECR with `:sha-<short>` tags
2. CD bumps the `image:` tag in `k8s/shopforge/*-deployment.yaml` on `main`
3. Argo CD detects drift and reconciles within 3 minutes
4. New pods come up, old pods are terminated by the Deployment rollout

No `kubectl apply` on a developer machine. Ever.

## Bumps along the way

- **CRLF line endings on Argo CD install** — server-side apply of CRDs failed
  silently; fixed by normalising line endings.
- **runAsUser missing** — kubelet couldn't verify non-root; fixed in the
  Deployment securityContext.
- **CORS env var format** — FastAPI expected a JSON array, not a CSV.

## Cost

~$5–8 per session (EKS + nodes + ALB).

## Teardown

```bash
# Critical: delete the app FIRST so ALB controller cleans up AWS resources
kubectl delete -f gitops/apps/shopforge.yaml
# wait ~2 min for ALB + target groups to disappear
terraform -chdir=infra/terraform/environments/dev destroy
```

[:material-arrow-left: Back to phases](index.md)
