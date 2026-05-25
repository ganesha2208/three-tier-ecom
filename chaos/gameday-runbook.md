# ShopForge — Chaos Game Day Runbook

A scripted walkthrough for running the four chaos experiments against a
live EKS cluster, watching the impact on Grafana, and recovering cleanly.
**Budget for the full drill: ~30 minutes of cluster time (~$1–2 burn).**

---

## Pre-flight (5 min)

Open four terminal panes — you'll keep them all running during the drill.

| Pane | Command | What it shows |
| --- | --- | --- |
| **1. Watch pods** | `kubectl -n shopforge get pods -w` | Replicas coming and going |
| **2. Grafana** | `kubectl -n observability port-forward --address 0.0.0.0 svc/kube-prometheus-stack-grafana 8080:80` | RED dashboard |
| **3. Chaos dashboard** | `kubectl -n chaos-mesh port-forward --address 0.0.0.0 svc/chaos-dashboard 2333:2333` | Experiment status |
| **4. Driver** | Free pane for `kubectl apply` / `delete` and `curl` | Where you run the experiments |

**Verify the baseline before starting:**

```bash
# All app pods Ready, HPA reporting current/target metrics
kubectl -n shopforge get pods,hpa

# Frontend reachable through the ALB
ALB=$(kubectl -n shopforge get ingress shopforge -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl -sI "http://$ALB" | head -1   # expect HTTP/1.1 200 OK
curl -s "http://$ALB/api/v1/products" | jq 'length'   # expect > 0
```

**Generate steady background load** (leave this running in pane 4 — it's what
makes the RED metrics visible). Open a fifth pane or run in background:

```bash
while true; do
  curl -s -o /dev/null "http://$ALB/api/v1/products"
  sleep 0.5
done
```

Open Grafana → **ShopForge — Backend (RED Metrics)** dashboard. You should
see a steady ~2 req/s, 0% errors, low latency. **This is your baseline.**

---

## Experiment 1 — Pod Kill (~2 min)

**Hypothesis:** killing one backend pod causes no user-visible impact.

```bash
kubectl apply -f chaos/experiments/01-pod-kill-backend.yaml
```

- **Pane 1:** one backend pod goes `Terminating`, a new one appears in
  `ContainerCreating` within seconds, becomes `Running` in ~15–30s.
- **Grafana:** request rate dips briefly then recovers. Error rate stays
  near 0% (background load may see a couple of failures during the
  failover — that's expected).
- **📸 Screenshot #1:** RED dashboard showing the dip + recovery, with
  the pod restart visible in pane 1.

```bash
kubectl delete -f chaos/experiments/01-pod-kill-backend.yaml
```

---

## Experiment 2 — Network Delay to RDS (~5 min)

**Hypothesis:** 500ms added latency to every RDS call slows requests but
doesn't fail them.

```bash
# Apply with the live RDS hostname substituted in
RDS_ENDPOINT=$(terraform -chdir=infra/terraform output -raw rds_endpoint | cut -d: -f1)
sed "s|__RDS_ENDPOINT__|$RDS_ENDPOINT|" \
  chaos/experiments/02-network-delay-rds.yaml | kubectl apply -f -
```

- **Grafana:** latency p95 climbs from ~50ms to ~600ms+ within ~30s.
  Request rate stays steady, error rate near 0%.
- **📸 Screenshot #2:** RED dashboard showing the latency spike — clearly
  elevated p95, clean error rate.
- After the 3-minute duration the chaos auto-clears and p95 returns to
  baseline within seconds.

```bash
# Clean up (safe to run before or after duration expires)
sed "s|__RDS_ENDPOINT__|$RDS_ENDPOINT|" \
  chaos/experiments/02-network-delay-rds.yaml | kubectl delete -f -
```

---

## Experiment 3 — CPU Stress → HPA Scale-up (~7 min)

**Hypothesis:** sustained 100% CPU on every backend pod triggers the HPA
to scale up.

Note current replica count first:

```bash
kubectl -n shopforge get hpa backend
# Look at REPLICAS column — typically 2 at idle
```

Apply the stress:

```bash
kubectl apply -f chaos/experiments/03-cpu-stress-backend.yaml
```

- **Watch HPA decisions (run in pane 4 for 3 minutes):**
  ```bash
  kubectl -n shopforge get hpa backend -w
  ```
- After ~60–90s, `TARGETS` column climbs to 100%+, then `REPLICAS` ticks
  up: 2 → 3 → 4. New pods appear in pane 1.
- **Grafana:** request rate per pod drops as load redistributes, latency
  briefly elevated then recovers.
- **📸 Screenshot #3:** the HPA `-w` output showing the scale-up sequence,
  ideally alongside the dashboard.

```bash
kubectl delete -f chaos/experiments/03-cpu-stress-backend.yaml

# HPA will scale back down on its own (~5 min cooldown), or force it:
kubectl -n shopforge get hpa backend
```

---

## Experiment 4 — Partial Outage / 50% Pod Failure (~5 min)

**Hypothesis:** the site stays available with only half the backend pods
serving traffic.

```bash
kubectl apply -f chaos/experiments/04-pod-failure-50pct.yaml
```

- **Pane 1:** half the backend pods flip to `Running` but with restarts
  ticking up (Chaos Mesh is killing them on a tight loop).
- **Pane 4 verification — site is still up:**
  ```bash
  for i in {1..20}; do
    curl -s -o /dev/null -w "%{http_code}\n" "http://$ALB/api/v1/products"
  done
  # expect 20x "200" — surviving pods carry the full load
  ```
- **Grafana:** Ready replicas halves, per-pod request rate roughly
  doubles, error rate stays near 0%.
- **📸 Screenshot #4:** dashboard + the `curl` loop output showing all
  200s during the partial outage.

```bash
kubectl delete -f chaos/experiments/04-pod-failure-50pct.yaml

# Verify all pods recover to Ready
kubectl -n shopforge get pods -l app=backend
```

---

## Post-flight (2 min)

```bash
# Confirm no chaos resources are lingering
kubectl get podchaos,networkchaos,stresschaos -A

# Confirm the app is back to baseline
kubectl -n shopforge get pods,hpa
curl -sI "http://$ALB" | head -1   # HTTP/1.1 200 OK
```

Kill the background load loop (Ctrl+C in pane 4 / 5).

**You now have 4 screenshots that demonstrate end-to-end chaos
engineering on a real EKS cluster, with RED-metrics-based validation
that the system absorbed each failure mode.** That's the artefact.
