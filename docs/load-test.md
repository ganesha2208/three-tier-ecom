# Load Test

A k6 script exercises the live ShopForge ALB with a realistic browsing
journey, ramping to 100 concurrent users. The point isn't a benchmark
number — it's to *see HPA work* and to know where the system breaks first.

## What the test does

Each virtual user runs this loop:

1. `GET /api/v1/products` (list)
2. Pick a random product, `GET /api/v1/products/{id}` (detail)
3. `GET /api/v1/products?category=...` (filter)
4. 1s think time between iterations

## Ramp profile

| Stage             | Duration | Target VUs |
| ----------------- | -------- | ---------- |
| Ramp up           | 1 min    | 20         |
| Sustain           | 2 min    | 20         |
| Ramp up to peak   | 1 min    | 100        |
| Sustain peak      | 3 min    | 100        |
| Ramp down         | 1 min    | 0          |

**Total runtime:** ~8 minutes per run.

## Thresholds

```javascript
thresholds: {
  http_req_duration: ['p(95)<800'],   // p95 latency under 800ms
  http_req_failed:   ['rate<0.01'],   // error rate under 1%
  checks:            ['rate>0.99'],   // 99% of response-content checks pass
}
```

If any threshold is violated, k6 exits non-zero — usable as a CI gate in a
future iteration.

## How to run

See [`loadtest/README.md`](https://github.com/ganesha2208/three-tier-ecom/tree/main/loadtest)
for setup. The short version:

```bash
# Get the live ALB hostname
ALB=$(kubectl -n shopforge get ingress shopforge \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Run from your laptop (k6 binary required)
k6 run -e ALB="http://$ALB" loadtest/k6-checkout.js
```

## What to watch on Grafana

Open the **ShopForge — Backend (RED Metrics)** dashboard before starting:

1. **Request rate** — should climb from ~0 to ~100 req/s during the peak
   stage.
2. **Backend HPA replicas** — should scale 2 → 4 during the peak; watch
   `kubectl -n shopforge get hpa backend -w` in another pane.
3. **p95 latency** — first response to load is a brief spike, then drops
   as new pods come online and absorb traffic.
4. **Error rate** — should stay flat at 0; if it climbs, the bottleneck is
   downstream (RDS connection pool exhaustion is the first usual suspect).

## Results

Will be filled in after the [live EKS run](phases/phase-8.md).

| Metric              | Observed value |
| ------------------- | -------------- |
| Peak request rate   | _(to be measured)_ |
| p95 latency at peak | _(to be measured)_ |
| Error rate          | _(to be measured)_ |
| HPA scale-up time   | _(to be measured)_ |
| Replicas at peak    | _(to be measured)_ |
| First bottleneck    | _(to be identified)_ |

## Why this scope

100 VUs against a 2-pod backend on a t3.micro RDS isn't a Black Friday
test, and it shouldn't pretend to be. It's the *minimum honest load* to
see autoscaling fire and to learn which subsystem saturates first — which
is the *only* useful output of a portfolio load test.
