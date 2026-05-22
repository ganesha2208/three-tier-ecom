#!/usr/bin/env bash
#
# ShopForge — one-time platform bootstrap for the EKS cluster.
#
# Run this AFTER `terraform apply` finishes. It is idempotent — safe to
# re-run. It installs the cluster add-ons and hands the app to Argo CD.
#
#   Shell prereqs: aws, kubectl, helm, jq, terraform, openssl
#
set -euo pipefail

REGION="ap-south-1"
PROJECT="shopforge"
CLUSTER="${PROJECT}-eks"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "${SCRIPT_DIR}/../infra/terraform" && pwd)"

echo "==> [1/6] Reading Terraform outputs"
VPC_ID=$(terraform -chdir="$TF_DIR" output -raw vpc_id)
LB_ROLE_ARN=$(terraform -chdir="$TF_DIR" output -raw lb_controller_role_arn)
RDS_ENDPOINT=$(terraform -chdir="$TF_DIR" output -raw rds_endpoint)
RDS_SECRET_ARN=$(terraform -chdir="$TF_DIR" output -raw rds_secret_arn)

echo "==> [2/6] Connecting kubectl to the cluster"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"

echo "==> [3/6] Installing metrics-server (required by the HPAs)"
kubectl apply -f \
  https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo "==> [4/6] Installing the AWS Load Balancer Controller"
helm repo add eks https://aws.github.io/eks-charts >/dev/null 2>&1 || true
helm repo update >/dev/null
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName="$CLUSTER" \
  --set region="$REGION" \
  --set vpcId="$VPC_ID" \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=${LB_ROLE_ARN}" \
  --wait

echo "==> [5/6] Installing Argo CD"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
# --server-side avoids the 256KB last-applied-configuration annotation limit
# (the applicationsets CRD is larger than that). --force-conflicts lets it
# take ownership of resources a prior client-side apply may have created.
kubectl apply -n argocd --server-side --force-conflicts -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server --timeout=300s

echo "==> [6/6] Creating the shopforge namespace + app Secret"
kubectl create namespace shopforge --dry-run=client -o yaml | kubectl apply -f -

# Pull the RDS master password from Secrets Manager (never stored in git)
# and build the SQLAlchemy connection string the backend expects.
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --region "$REGION" --secret-id "$RDS_SECRET_ARN" \
  --query SecretString --output text | jq -r .password)

DATABASE_URL="postgresql+psycopg2://shopforge:${DB_PASSWORD}@${RDS_ENDPOINT}/shopforge"

kubectl create secret generic shopforge-secrets \
  --namespace shopforge \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=SECRET_KEY="$(openssl rand -hex 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Registering the Argo CD Application"
kubectl apply -f "${SCRIPT_DIR}/platform/argocd-application.yaml"

cat <<'EOF'

────────────────────────────────────────────────────────────
 Bootstrap complete. Argo CD will now sync the app from git.

 Watch the rollout:
   kubectl -n shopforge get pods -w

 Get the live URL (wait ~3-5 min for the ALB to provision):
   kubectl -n shopforge get ingress shopforge

 Open the Argo CD UI:
   kubectl -n argocd port-forward svc/argocd-server 8080:443
   # then browse https://localhost:8080  (username: admin)
   kubectl -n argocd get secret argocd-initial-admin-secret \
     -o jsonpath='{.data.password}' | base64 -d ; echo
────────────────────────────────────────────────────────────
EOF
