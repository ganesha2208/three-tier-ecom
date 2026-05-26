# Phase 3 — DevSecOps CI/CD

**Goal:** every PR runs the full quality gate; every merge to `main`
ships a signed image to ECR with zero static AWS credentials.

## What shipped

- `.github/workflows/ci.yml` — runs on every PR
  - backend: ruff, pytest with coverage
  - frontend: eslint, tsc, vitest
  - container build (no push) for both images
  - Trivy filesystem scan for HIGH/CRITICAL
- `.github/workflows/cd.yml` — runs on push to `main`
  - GitHub OIDC → assume IAM role (no long-lived keys in the repo)
  - Build & push backend + frontend images to ECR with `:sha-<short>` tags
  - Bump image tags in `gitops/apps/*` so Argo CD picks the new build up

## Key files

- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `infra/terraform/modules/iam/github_oidc.tf` — OIDC provider + trust policy

## Why OIDC matters

Static AWS access keys in GitHub Secrets is the historical pattern, and it
is exactly how breaches happen — a leaked key is durable, the blast radius
is whatever the role can do. OIDC federation issues a short-lived token
scoped to the specific workflow run and repository. The same outcome
(deploys work) with vastly less risk.

## Cost

GitHub Actions on a public repo is free. ECR storage <$1/mo.

[:material-arrow-left: Back to phases](index.md)
