# Load test

A small k6 script that ramps realistic browsing traffic against the live
ShopForge ALB, with the express purpose of **seeing the HPA scale up** and
**finding the first bottleneck**. See the project docs site for the full
write-up: [load-test page](https://ganesha2208.github.io/three-tier-ecom/load-test/).

## Install k6

| OS | Command |
| --- | --- |
| macOS | `brew install k6` |
| Ubuntu / WSL | follow https://k6.io/docs/get-started/installation/#linux |
| Windows | `choco install k6` |

## Run

```bash
# Get the live ALB hostname (from inside the cluster)
ALB=$(kubectl -n shopforge get ingress shopforge \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Run the script
k6 run -e ALB="http://$ALB" loadtest/k6-checkout.js
```

You can override the peak VU count from the CLI:

```bash
k6 run -e ALB="http://$ALB" -e PEAK_VUS=50 loadtest/k6-checkout.js
```

The script writes a JSON results file to `loadtest/results.json` (not
committed) and prints a short summary to stdout.

## What to watch in parallel

In other panes, run:

```bash
kubectl -n shopforge get hpa backend -w     # watch replica count
kubectl -n shopforge get pods -w            # watch new pods come up

# Grafana port-forward (if not already running)
kubectl -n observability port-forward --address 0.0.0.0 \
  svc/kube-prometheus-stack-grafana 8080:80
```

Open Grafana → **ShopForge — Backend (RED Metrics)** dashboard.

## Thresholds

The script sets these gates:

- `http_req_duration` p95 < 800 ms
- `http_req_failed` rate < 1 %
- `content_checks_passed` rate > 99 %

If any fail, `k6` exits non-zero — suitable as a future CI gate.

## Cost

~$0.50–1.00 for a 30-minute cluster session. The k6 binary itself runs
locally, no infra needed on the test-driver side at this scale.
