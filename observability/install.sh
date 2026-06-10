#!/usr/bin/env bash
#
# ShopForge — install the observability stack (metrics + logs + alerting).
#
# Run AFTER the cluster is up and the app is deployed, i.e. after
# `terraform apply` + `gitops/bootstrap.sh`. Idempotent — safe to re-run.
#
#   Shell prereqs: kubectl (connected to the cluster), helm
#
# Email alerting:
#   Pass the Gmail App Password via the SMTP_PASSWORD env var, e.g.
#     SMTP_PASSWORD='abcd efgh ijkl mnop' ./install.sh
#   Without it, the alerting wiring is skipped (cluster still healthy,
#   rules still fire, just no email fan-out).
set -euo pipefail

NS="observability"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> [1/6] Helm repos + namespace"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null 2>&1 || true
helm repo update >/dev/null
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -

echo "==> [2/6] Installing kube-prometheus-stack (Prometheus + Grafana + Alertmanager)"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace "$NS" \
  -f "${SCRIPT_DIR}/kube-prometheus-stack-values.yaml" \
  --wait --timeout 10m

echo "==> [3/6] Installing Loki + Promtail (logs)"
helm upgrade --install loki grafana/loki-stack \
  --namespace "$NS" \
  -f "${SCRIPT_DIR}/loki-values.yaml" \
  --wait --timeout 10m

echo "==> [4/6] Applying the ServiceMonitor + alert rules"
kubectl apply -f "${SCRIPT_DIR}/servicemonitor.yaml"
kubectl apply -f "${SCRIPT_DIR}/alerts.yaml"

echo "==> [5/6] Wiring email alerting (Gmail SMTP)"
if [ -n "${SMTP_PASSWORD:-}" ]; then
  # Strip whitespace from the 16-char App Password (Google displays it with spaces).
  CLEAN_PASS="$(echo -n "$SMTP_PASSWORD" | tr -d '[:space:]')"
  kubectl -n "$NS" create secret generic smtp-creds \
    --from-literal=password="$CLEAN_PASS" \
    --dry-run=client -o yaml | kubectl apply -f -
  kubectl apply -f "${SCRIPT_DIR}/alertmanager-config.yaml"
  echo "    OK — alerts will fan out to email."
else
  echo "    SKIPPED — set SMTP_PASSWORD env var to enable email alerting."
  echo "    The AlertmanagerConfig is NOT applied without the secret."
fi

echo "==> [6/6] Loading the Grafana dashboard"
# Grafana's sidecar auto-imports any ConfigMap labelled grafana_dashboard=1.
kubectl -n "$NS" create configmap shopforge-dashboard \
  --from-file="${SCRIPT_DIR}/dashboards/shopforge-backend.json" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "$NS" label configmap shopforge-dashboard grafana_dashboard=1 --overwrite

cat <<'EOF'

────────────────────────────────────────────────────────────
 Observability stack installed.

 Open Grafana (user: admin   password: prom-operator):
   kubectl -n observability port-forward --address 0.0.0.0 \
     svc/kube-prometheus-stack-grafana 8080:80
   # then browse  http://<WSL_IP>:8080

 - Dashboard:  "ShopForge — Backend (RED Metrics)"
 - Logs:       Explore -> pick the "Loki" data source
 - Alerts:     Alerting -> Alert rules  (8 ShopForge rules)
 - Email:      passed via SMTP_PASSWORD env var on install
────────────────────────────────────────────────────────────
EOF
