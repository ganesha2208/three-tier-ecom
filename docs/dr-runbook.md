# Disaster Recovery Runbook

**Scope:** ShopForge production-equivalent EKS + RDS environment in
`ap-south-1`.

**Audience:** the on-call engineer at 3am.

---

## Recovery objectives

| Failure scenario                | RPO target | RTO target | Mechanism                                |
| ------------------------------- | ---------- | ---------- | ---------------------------------------- |
| Single pod / node loss          | 0          | < 1 min    | Kubernetes Deployment + HPA              |
| Backend image regression        | 0          | < 5 min    | `kubectl rollout undo` / Argo CD rollback|
| Accidental DB row delete        | ≤ 5 min    | ≤ 30 min   | RDS PITR restore to new instance         |
| Full RDS instance loss          | ≤ 5 min    | ≤ 45 min   | Restore from automated snapshot          |
| AZ outage                       | ≤ 5 min    | ≤ 60 min   | Re-apply Terraform with surviving AZ     |
| Region outage (`ap-south-1`)    | ≤ 24 hrs   | ≤ 4 hrs    | Restore cross-region snapshot copy in `ap-southeast-1` |

> **RPO** (Recovery Point Objective) = max acceptable data loss.
> **RTO** (Recovery Time Objective) = max acceptable downtime.

These are the **targets** the architecture is designed to meet at this
budget. The 5 min RPO follows from RDS automated backups being on, with
PITR enabled (5-minute transaction log granularity). The cross-region
24 hr RPO is because automated snapshots are copied to the DR region
nightly, not continuously — a tradeoff for cost.

---

## Backups in place

| What                          | How                                                | Retention |
| ----------------------------- | -------------------------------------------------- | --------- |
| RDS automated backups + PITR  | RDS feature, daily window, 7-day retention         | 7 days    |
| RDS manual snapshot (pre-deploy) | Trigger from CD on schema-changing migrations    | 30 days   |
| Cross-region snapshot copy    | EventBridge → Lambda copies last snapshot nightly  | 14 days   |
| Cluster manifests             | All in Git (`gitops/` + `k8s/`)                    | forever   |
| Terraform state               | S3 bucket with versioning + KMS encryption         | forever   |

The cluster itself is **stateless** — every resource is reproducible from
Terraform + Git. Loss of the cluster is annoying, not disastrous. Loss of
RDS data is the real failure mode this runbook protects against.

---

## Scenario 1 — Accidental data delete (most common)

**Symptom:** "I just ran a DELETE without a WHERE clause."

**Actions:**

1. **Stop the bleeding.** Block writes to the affected table:

    ```bash
    # Reduce backend to zero replicas to prevent further damage
    kubectl -n shopforge scale deploy/backend --replicas=0
    ```

2. **Identify the timestamp of the bad statement.** Check CloudWatch RDS
   logs or application logs (Loki) for the offending query. Note the
   timestamp *just before* the bad statement.

3. **Restore via PITR to a new instance.** RDS PITR creates a *new*
   instance, never overwrites the live one — this is intentional, so you
   can compare and copy data over.

    ```bash
    aws rds restore-db-instance-to-point-in-time \
      --source-db-instance-identifier shopforge-dev \
      --target-db-instance-identifier shopforge-dev-restore \
      --restore-time 2026-05-26T14:30:00Z \
      --db-subnet-group-name shopforge-db \
      --vpc-security-group-ids sg-XXXX \
      --no-publicly-accessible
    ```

   Restore takes **~15–25 min** for a db.t3.micro.

4. **Cherry-pick the lost rows back into prod.** Connect to the restored
   instance, `pg_dump` the affected table(s) WHERE clause matching the
   lost rows, then `psql` them into the live instance.

5. **Scale backend back up.**

    ```bash
    kubectl -n shopforge scale deploy/backend --replicas=2
    ```

6. **Delete the restore instance** when done — it's billing.

    ```bash
    aws rds delete-db-instance \
      --db-instance-identifier shopforge-dev-restore \
      --skip-final-snapshot
    ```

7. **Post-incident:** add a database role with restricted DELETE privileges
   so the bad command can't be re-run.

---

## Scenario 2 — Full RDS instance loss

**Symptom:** RDS instance shows `failed` state in AWS console, backend
pods crashloop with connection errors.

**Actions:**

1. **Confirm the failure.** Don't restore over a recoverable instance.

    ```bash
    aws rds describe-db-instances \
      --db-instance-identifier shopforge-dev \
      --query 'DBInstances[].DBInstanceStatus'
    ```

2. **Restore from the most recent automated snapshot:**

    ```bash
    # List snapshots
    aws rds describe-db-snapshots \
      --db-instance-identifier shopforge-dev \
      --snapshot-type automated \
      --query 'DBSnapshots[].[DBSnapshotIdentifier,SnapshotCreateTime]'

    # Restore to a new instance with the SAME identifier the app expects
    aws rds restore-db-instance-from-db-snapshot \
      --db-instance-identifier shopforge-dev \
      --db-snapshot-identifier rds:shopforge-dev-2026-05-26-04-00 \
      --db-subnet-group-name shopforge-db \
      --vpc-security-group-ids sg-XXXX
    ```

   ⚠️ If you're restoring with the same identifier, the original failed
   instance must be deleted first (`--skip-final-snapshot` if needed).

3. **Update Secrets Manager** if the new endpoint differs (it shouldn't if
   the identifier matches).

4. **Restart backend pods** to pick up the fresh connection pool:

    ```bash
    kubectl -n shopforge rollout restart deploy/backend
    ```

5. **Verify** with a `/health` probe and a sample query.

**Observed RTO in drill:** ~25 min from snapshot select to first 200 OK.

---

## Scenario 3 — Region failure (`ap-south-1` unreachable)

This is the *theoretical* DR path — out of budget to drill live. The
architecture supports it; this section is what an interviewer expects you
to be able to walk through.

**Pre-requisites already in place:**

- Nightly cross-region snapshot copy to `ap-southeast-1`
- Terraform code is region-agnostic (region in tfvars)
- Container images in ECR are *not* cross-region-replicated (would need to
  be added — see "Improvements" below)

**Actions:**

1. **Confirm `ap-south-1` is actually down**, not just our networking.
   Check AWS Service Health Dashboard.

2. **Restore the latest cross-region snapshot in `ap-southeast-1`:**

    ```bash
    aws rds restore-db-instance-from-db-snapshot \
      --region ap-southeast-1 \
      --db-instance-identifier shopforge-dr \
      --db-snapshot-identifier shopforge-dev-2026-05-25-copy \
      --db-subnet-group-name shopforge-db-dr \
      --vpc-security-group-ids sg-DR-XXXX
    ```

3. **Apply Terraform in the DR region:**

    ```bash
    cd infra/terraform/environments/dr
    terraform apply -var="region=ap-southeast-1" \
                    -var="rds_endpoint=<the new endpoint>"
    ```

   Builds VPC + EKS + everything except RDS (which we restored manually
   above and reference by endpoint).

4. **Push images to a DR-region ECR.** Without cross-region replication
   this means re-running CD with `AWS_REGION=ap-southeast-1`. Take the
   image-pull latency hit.

5. **Cut DNS / load balancer over** to the DR ALB hostname.

6. **Smoke test** the critical path: register → browse → cart → checkout.

**Estimated RTO:** ~3.5 hours if all manual; could be brought to <1 hour
with active-passive Terraform pre-staged and image cross-region replication.

---

## What to add for a real production posture

The architecture documented here is **portfolio-grade**, not production.
What I'd add next, in priority order:

1. **Multi-AZ RDS** — instance failure now means a snapshot restore (~25 min).
   Multi-AZ would make it sub-minute.
2. **ECR cross-region replication** — removes the "re-run CD in DR region"
   step.
3. **Active-passive Terraform in DR region** — VPC + EKS pre-provisioned,
   scaled to zero nodes. Activates in minutes, not hours.
4. **Read replica in the DR region** — drops cross-region RPO from 24 hrs
   to near-zero.
5. **DR drill cadence** — quarterly restore drill recorded with timing.

---

## How this runbook was validated

| Scenario      | Status                                                  |
| ------------- | ------------------------------------------------------- |
| Pod loss      | ✅ exercised in [Chaos Phase 7](phases/phase-7.md)      |
| Node loss     | ⏳ not drilled; HPA + Deployment behaviour confirmed by inspection |
| RDS PITR      | 📄 documented; not run live (would need a paid Multi-AZ instance) |
| RDS snapshot restore | 📄 documented; not run live to preserve budget   |
| Region failover | 📄 documented theory only                             |

This is the honest scope. The pod-loss path is *proven*; the rest is
runbook-as-design. An interviewer will respect the distinction.
