# ShopForge — Observability (Phase 6)

Metrics + logs for the ShopForge app running on EKS.

```
observability/
├── install.sh                          one-shot installer for the whole stack
├── kube-prometheus-stack-values.yaml   Helm values: Prometheus + Grafana + Alertmanager
├── loki-values.yaml                    Helm values: Loki + Promtail (logs)
├── servicemonitor.yaml                 tells Prometheus to scrape the backend
├── alerts.yaml                         PrometheusRule — 3 app-specific alerts
└── dashboards/
    └── shopforge-backend.json          Grafana RED-metrics dashboard
```

## How it works

The backend exposes `/metrics` (via `prometheus-fastapi-instrumentator`).
A **ServiceMonitor** tells **Prometheus** to scrape it. **Promtail** ships every
pod's logs into **Loki**. **Grafana** visualises both — the RED dashboard for
metrics, the Explore view for logs. **Alertmanager** would route the alert rules.

```
backend /metrics ──► Prometheus ──┐
                                  ├──► Grafana (dashboards + Explore)
pod logs ──► Promtail ──► Loki ───┘
```

## Live session — run order

> 💸 Runs on the live cluster (~$9/day). Do the free steps first, then one
> focused sitting for apply → install → screenshot → destroy.

### 1. Pin the new backend image  *(free)*

Phase 6 changed backend code, so a fresh image exists in ECR. Pin it in the
GitOps manifests (same as Phase 5):

```bash
cd /mnt/d/GaneshaAWS/Projects/AB
TAG=$(aws ecr describe-images --repository-name shopforge-backend --region ap-south-1 \
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' --output text)
sed -i "s#shopforge-backend:[a-f0-9]*#shopforge-backend:$TAG#g" gitops/apps/shopforge/*.yaml
```
Commit + merge to `main`.

### 2. Bring the platform up

```bash
cd infra/terraform && terraform apply        # ~15-20 min
cd .. && bash gitops/bootstrap.sh            # app deploys via Argo CD
```

### 3. Install the observability stack

```bash
bash observability/install.sh                # ~5-8 min
```

### 4. Generate traffic, then view

```bash
URL=http://<ALB-DNS>
for i in $(seq 1 200); do curl -s -o /dev/null $URL/api/v1/products; done
```
Open Grafana (see the command install.sh prints) → the **ShopForge — Backend
(RED Metrics)** dashboard fills in; **Explore → Loki** shows live logs.

### 5. Teardown

Observability is entirely in-cluster (no ALB of its own), so the normal
Phase 5 teardown covers it:

```bash
kubectl delete application shopforge -n argocd   # ALB removed
cd infra/terraform && terraform destroy
```

## Troubleshooting

- **Dashboard has no data** — confirm the backend pods run the `/metrics`
  image; check `kubectl -n shopforge get servicemonitor` and Prometheus
  *Status → Targets* for the `shopforge-backend` target being UP.
- **No logs in Loki** — check the Promtail DaemonSet:
  `kubectl -n observability get pods | grep promtail`.
