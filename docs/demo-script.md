# Demo video script (3–5 min)

A tight walkthrough recruiters can watch end-to-end without scrubbing. The
target is **4 minutes**.

---

## Beat sheet

| # | Time     | Beat                              | What's on screen                          |
| - | -------- | --------------------------------- | ----------------------------------------- |
| 1 | 0:00–0:25 | Hook + what this is               | This docs site, hero section              |
| 2 | 0:25–1:00 | Architecture                      | `architecture.md` mermaid diagram         |
| 3 | 1:00–1:40 | Live app + GitOps                 | Storefront in browser → Argo CD app tree  |
| 4 | 1:40–2:25 | Observability                     | Grafana RED dashboard at baseline         |
| 5 | 2:25–3:15 | Chaos drill (one experiment live) | Apply pod-kill YAML → watch dashboard react |
| 6 | 3:15–3:45 | Load test                         | k6 running + HPA scale-up in Grafana      |
| 7 | 3:45–4:00 | Wrap                              | "What I'd build next" + repo URL          |

---

## Voiceover script

### 1. Hook (0:00 – 0:25)

> "I built ShopForge as an AWS DevOps portfolio — a real three-tier
> e-commerce app, shipped to production-style EKS with Terraform, Argo CD,
> Prometheus, Loki, and Chaos Mesh. Everything you'll see is running on a
> live cluster I just spun up; total spend across the whole portfolio is
> under fifteen dollars."

### 2. Architecture (0:25 – 1:00)

> "The cluster sits in ap-south-1. Traffic comes in through an ALB
> provisioned by the AWS Load Balancer Controller in response to the
> Ingress object — so the load balancer is GitOps-managed, not
> click-ops-managed. Backend is FastAPI with an HPA scaling between 2 and
> 10 replicas at 70% CPU. State is in RDS Postgres. Argo CD reconciles
> the gitops directory in this repo into the cluster — there's no
> kubectl apply happening on my laptop."

### 3. Live app + GitOps (1:00 – 1:40)

> *(browser to storefront)*
> "This is the storefront — React on Vite, served from a frontend pod
> behind that same ALB."
>
> *(switch to Argo CD)*
> "And here's the Argo CD app tree. The shopforge Application is in sync;
> every object you see here came from a Git commit. When I push a new
> backend image to ECR, CI bumps the tag in the manifest, Argo notices
> the drift, and rolls it out within three minutes."

### 4. Observability (1:40 – 2:25)

> *(Grafana RED dashboard)*
> "This is the RED dashboard for the backend service — request rate on
> the left, error rate in the middle, latency p50 / p95 / p99 on the
> right. The instrumentation is plain `prometheus-client` on a `/metrics`
> route; the Prometheus operator scrapes it via a ServiceMonitor.
> Right now you're seeing the steady background load — about two
> requests per second, zero errors, sub-50ms p95. This is the baseline
> we measure failures against."

### 5. Chaos drill (2:25 – 3:15)

> *(kubectl pane visible alongside Grafana)*
> "Now I'll inject a failure. This Chaos Mesh experiment will kill one
> backend pod."
>
> *(apply the YAML)*
> "On the left you see the pod terminate, a new one appear, and reach
> Ready in about two seconds — faster than Kubernetes' default 30-second
> readiness budget. On the dashboard, the request rate dips for a
> heartbeat and recovers. No user-visible downtime."
>
> *(brief mention)*
> "The same drill was run with network delay to RDS, CPU stress to
> trigger HPA scale-up, and a 50% pod failure — all on the Phase 7 page
> of the docs site."

### 6. Load test (3:15 – 3:45)

> *(k6 terminal + Grafana side by side)*
> "And here's a k6 load test ramping from 20 to 100 virtual users. Watch
> the HPA — replicas climb from 2 to 4 as CPU crosses the target. p95
> latency rises briefly while the new pods spin up, then settles. Zero
> errors throughout."

### 7. Wrap (3:45 – 4:00)

> "All of this is documented and reproducible in the repo. The DR
> runbook, what I cut and why, and the war stories — like the time
> terraform destroy hung for nineteen minutes because the LB controller
> had orphaned resources — are all on this docs site. The repo link is
> in the description. Thanks for watching."

---

## Recording checklist

- [ ] Cluster is up and healthy (`kubectl -n shopforge get pods` all Ready)
- [ ] Background load loop running (so dashboards have data)
- [ ] Grafana dashboard pre-loaded in a browser tab
- [ ] Argo CD UI pre-loaded in a browser tab
- [ ] Terminal panes pre-arranged (kubectl watch + driver + k6)
- [ ] One Chaos Mesh experiment ready to `kubectl apply`
- [ ] k6 script ready to run with the ALB env var set
- [ ] Mic levels checked; close Slack / notifications
- [ ] Screen recorder set to capture full screen at 1080p+

## Tools

- **Recording:** Loom, OBS, or QuickTime
- **Cursor highlight:** Loom adds it automatically; OBS needs a plugin
- **Trim / final cut:** any basic editor (DaVinci Resolve free is overkill but works)

## Honesty note for the voiceover

Don't say *"we"* — it's a solo portfolio project, *"I"* throughout. Don't
claim metrics not on the dashboard at that moment. The point of the
recording is to be a faithful artifact of a real live run.
