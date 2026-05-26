# Phase 4 — Terraform Infrastructure

**Goal:** every AWS resource defined in code; one `apply` from zero to a
working cluster; one `destroy` to stop billing.

## What shipped

Modules under `infra/terraform/modules/`:

| Module          | Resources                                                         |
| --------------- | ----------------------------------------------------------------- |
| `vpc`           | 2 AZs, public + private subnets, single NAT (cost-optimised)      |
| `eks`           | EKS 1.30 control plane, managed node group, OIDC provider         |
| `rds`           | PostgreSQL 16, db.t3.micro, KMS encrypted, backup window          |
| `ecr`           | Backend + frontend repos, immutable tags, scan-on-push            |
| `iam`           | IRSA roles for ALB controller + service accounts; GitHub OIDC     |

Environment glue under `infra/terraform/environments/dev/`.

## Key files

- `infra/terraform/environments/dev/main.tf`
- `infra/terraform/modules/eks/main.tf`
- `infra/terraform/modules/iam/irsa.tf`

## Notable design choices

- **Single NAT** instead of one-per-AZ — saves ~$32/month. For a portfolio
  the availability hit during NAT failure is acceptable; in production this
  would be one-per-AZ.
- **No Multi-AZ RDS** — see [Architecture](../architecture.md#why-rds-single-az-not-multi-az).
- **Managed node group** instead of Karpenter — Karpenter shines at 50+
  nodes; at 2–4 nodes managed is simpler and cheaper.

## Spin-up / teardown

```bash
cd infra/terraform/environments/dev
terraform apply        # ~12 minutes, ~$1-2 per session
# ... work ...
terraform destroy      # ~10 minutes
```

⚠️ **Order matters**: if Argo CD has deployed apps with `Ingress` objects,
delete the Argo CD `Application` *first* so the AWS LB Controller cleans up
the ALB + target groups + security groups it created. Otherwise
`terraform destroy` will hang on a `DependencyViolation` for the VPC —
[learned this the hard way in Phase 7](phase-7.md#interview-lesson-teardown-order).

## Cost

~$5 per multi-hour session (NAT + EKS control plane dominate).

[:material-arrow-left: Back to phases](index.md)
