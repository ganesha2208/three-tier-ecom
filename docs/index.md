# ShopForge

A production-grade e-commerce platform built end-to-end as a hands-on **AWS
DevOps portfolio**. Three tiers (React + FastAPI + PostgreSQL), shipped to
**EKS** via **Terraform** and **Argo CD GitOps**, instrumented with
**Prometheus + Loki + Grafana**, hardened with **Chaos Mesh** drills, and
load-tested with **k6**.

> Live cluster is spun up only during demo windows — total spend across all 8
> phases stayed under **$15**.

---

## What this portfolio demonstrates

- **Infrastructure as Code** — every AWS resource (VPC, EKS, RDS, IAM, ALB,
  ECR) is in Terraform. One `apply` from zero to a working cluster.
- **GitOps delivery** — Argo CD reconciles `gitops/apps/*` to the cluster. A
  merged image-tag bump is the deploy.
- **CI/CD with quality gates** — GitHub Actions runs lint, tests, container
  scan, and pushes signed images to ECR.
- **Production observability** — RED metrics dashboards, structured JSON logs
  in Loki, ServiceMonitor scraping, alerts wired to the right panels.
- **Resilience proven, not claimed** — four Chaos Mesh experiments executed
  live (pod kill, network delay, CPU stress, 50% pod failure) with the
  dashboard reactions captured.
- **Honest load numbers** — k6 ramping to 100 concurrent users against the
  live ALB, with HPA scale-up visible in Grafana.
- **Disaster recovery thinking** — RDS PITR + snapshot restore drill, RTO/RPO
  targets, region-failover theory.

---

## Quick links

<div class="grid cards" markdown>

-   :material-sitemap: **Architecture**

    ---

    System diagram, request lifecycle, and the AWS resource topology.

    [:octicons-arrow-right-24: View](architecture.md)

-   :material-map: **Recap**

    ---

    A diagrammatic walkthrough of all 8 phases — what was built, why, and
    how the layers stack together.

    [:octicons-arrow-right-24: See the journey](recap.md)

-   :material-list-status: **Phases**

    ---

    What each of the 8 phases shipped, why it was scoped that way, and what
    was deliberately cut.

    [:octicons-arrow-right-24: Browse](phases/index.md)

-   :material-image-multiple: **Screenshots**

    ---

    Grafana dashboards under chaos, HPA scale-up under load, Argo CD app
    tree — the visual artefacts.

    [:octicons-arrow-right-24: Gallery](screenshots.md)

-   :material-shield-alert: **Runbooks**

    ---

    DR procedure with RPO/RTO targets and the chaos game day script.

    [:octicons-arrow-right-24: Read](dr-runbook.md)

</div>

---

## Stack at a glance

| Layer            | Technology                                                       |
| ---------------- | ---------------------------------------------------------------- |
| Frontend         | React 18 + TypeScript, Vite, Tailwind, React Query, Zustand      |
| Backend          | Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, JWT  |
| Database         | PostgreSQL 16 (RDS)                                              |
| Container build  | Multi-stage Docker, non-root, pinned base images                 |
| Registry         | Amazon ECR (immutable tags)                                      |
| IaC              | Terraform — VPC, EKS, RDS, IAM, ECR, IRSA                        |
| Orchestration    | Amazon EKS 1.30 + managed node group                             |
| Ingress          | AWS Load Balancer Controller → ALB                               |
| GitOps           | Argo CD (app-of-apps pattern)                                    |
| Observability    | kube-prometheus-stack, Loki + Promtail, Grafana                  |
| Chaos            | Chaos Mesh (PodChaos, NetworkChaos, StressChaos)                 |
| Load test        | k6                                                               |
| CI/CD            | GitHub Actions + OIDC to AWS                                     |
| Docs             | MkDocs Material → GitHub Pages                                   |

---

## Honesty note

Every metric in this site comes from a measurement on **this** cluster.
Every screenshot is from a live run, not a stock image. If a feature isn't
listed in the [phases](phases/index.md), it wasn't built. The full plan and
what was cut is documented in `DEVOPS_PLAN.md` in the repo root.
