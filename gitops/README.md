# ShopForge — GitOps Deployment (Phase 5)

Deploys the ShopForge app to **AWS EKS** using **Argo CD** for GitOps.

```
gitops/
├── bootstrap.sh                 one-time platform bootstrap (run after terraform apply)
├── platform/
│   └── argocd-application.yaml  the Argo CD Application (repo = source of truth)
└── apps/shopforge/              the app manifests Argo CD syncs
    ├── configmap.yaml           non-secret backend config
    ├── backend-deployment.yaml  FastAPI pods
    ├── backend-service.yaml
    ├── frontend-deployment.yaml React + nginx pods
    ├── frontend-service.yaml
    ├── db-migrate-job.yaml      alembic migrate + seed (Argo PreSync hook)
    ├── hpa.yaml                 CPU autoscaling
    └── ingress.yaml             ALB — /api -> backend, / -> frontend
```

## How it works

`terraform apply` (Phase 4) builds the VPC + RDS + **EKS cluster**.
`bootstrap.sh` installs the add-ons (metrics-server, AWS Load Balancer
Controller, Argo CD) and registers one Argo CD **Application**. From then on,
Argo CD watches `gitops/apps/shopforge` on `main` and keeps the cluster
matching git — **deploying a new version = committing a new image tag.**

The DB credentials live in AWS Secrets Manager and are turned into a
Kubernetes Secret by `bootstrap.sh`. **No secret is ever committed to git.**

---

## Prerequisites (WSL Ubuntu)

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -m 0755 kubectl /usr/local/bin/kubectl && rm kubectl

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# jq
sudo apt-get update && sudo apt-get install -y jq
```

`aws`, `terraform`, `openssl` are already installed from earlier phases.

---

## Live session — run order

> 💸 The cluster bills ~**$8-9/day** while up. Do Step 1 first (it is free —
> no cluster yet), then run Steps 2-5 in one focused sitting.

### Step 1 — Pin the image tags  *(free — no cluster yet)*

The manifests ship with `IMAGE_TAG_PLACEHOLDER`. Replace it with the latest
image tag already in ECR:

```bash
cd /mnt/d/GaneshaAWS/Projects/AB
TAG=$(aws ecr describe-images --repository-name shopforge-backend --region ap-south-1 \
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags[0]' --output text)
echo "Pinning image tag: $TAG"
sed -i "s/IMAGE_TAG_PLACEHOLDER/$TAG/g" gitops/apps/shopforge/*.yaml
```

Then commit + push this change through your usual **branch → PR → merge**
flow (Argo CD only reads `main`).

### Step 2 — Bring up the infrastructure

```bash
cd /mnt/d/GaneshaAWS/Projects/AB/infra/terraform
terraform apply        # ~15-20 min — review, then type: yes
```

### Step 3 — Bootstrap the platform

```bash
cd /mnt/d/GaneshaAWS/Projects/AB
bash gitops/bootstrap.sh
```

### Step 4 — Verify it is live

```bash
kubectl -n shopforge get pods            # all Running / Completed
kubectl -n shopforge get ingress shopforge   # ADDRESS = your live URL

curl http://<ALB-DNS>/health             # {"status":"ok"}
# open http://<ALB-DNS>/ in a browser — the ShopForge storefront
```

Argo CD UI (for screenshots): see the commands printed by `bootstrap.sh`.

### Step 5 — Teardown  ⚠️ ORDER MATTERS

The ALB is created by the controller, **not** Terraform. Delete it first or
`terraform destroy` will hang on the VPC.

```bash
# 1. Delete the Argo CD App. Its finalizer prunes everything it created,
#    including the Ingress -> the controller then deletes the ALB.
kubectl delete application shopforge -n argocd

# 2. Wait ~2-3 min, confirm no ShopForge ALB remains:
aws elbv2 describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancers[].LoadBalancerName'

# 3. Only now destroy the infrastructure:
cd /mnt/d/GaneshaAWS/Projects/AB/infra/terraform
terraform destroy
```

---

## Deploying a new version (the GitOps loop)

1. Push app code → CI/CD builds + pushes a new image tagged with the commit SHA.
2. Bump the tag in `gitops/apps/shopforge/*-deployment.yaml` + `db-migrate-job.yaml`.
3. Commit + merge to `main`.
4. Argo CD detects the change and rolls it out automatically.

## Troubleshooting

- **Pods `ImagePullBackOff`** — `IMAGE_TAG_PLACEHOLDER` was not replaced, or
  the tag does not exist in ECR. Re-check Step 1.
- **HPA shows `<unknown>` for CPU** — metrics-server not ready yet; give it a
  minute. If it persists, it may need `--kubelet-insecure-tls`.
- **Ingress has no ADDRESS** — check the controller:
  `kubectl -n kube-system logs deploy/aws-load-balancer-controller`.
- **Backend pods not Ready** — `/ready` checks the DB; confirm the
  `db-migrate` Job Completed and the Secret has a correct `DATABASE_URL`.
