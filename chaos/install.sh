#!/usr/bin/env bash
#
# ShopForge — install Chaos Mesh (chaos engineering control plane).
#
# Run AFTER the cluster is up and the app is deployed, i.e. after
# `terraform apply` + `gitops/bootstrap.sh`. Idempotent — safe to re-run.
#
#   Shell prereqs: kubectl (connected to the cluster), helm
#
set -euo pipefail

NS="chaos-mesh"

echo "==> [1/3] Adding the Chaos Mesh Helm repo"
helm repo add chaos-mesh https://charts.chaos-mesh.org >/dev/null 2>&1 || true
helm repo update >/dev/null

echo "==> [2/3] Installing Chaos Mesh"
# EKS nodes use containerd, not Docker — chaosDaemon must talk to the right
# socket or experiments silently no-op. Both flags below are EKS-specific.
helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace "$NS" --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
  --wait --timeout 5m

echo "==> [3/3] Waiting for the dashboard to be ready"
kubectl -n "$NS" rollout status deploy/chaos-dashboard --timeout=180s

cat <<'EOF'

────────────────────────────────────────────────────────────
 Chaos Mesh installed.

 Open the dashboard (no auth in dev mode):
   kubectl -n chaos-mesh port-forward --address 0.0.0.0 \
     svc/chaos-dashboard 2333:2333
   # then browse  http://<WSL_IP>:2333

 Run an experiment from the CLI:
   kubectl apply -f chaos/experiments/01-pod-kill-backend.yaml

 Tear an experiment down:
   kubectl delete -f chaos/experiments/01-pod-kill-backend.yaml
────────────────────────────────────────────────────────────
EOF
