# Phase 2 — Containers & Supply Chain

**Goal:** images that are small, non-root, scanned, and traceable to source.

## What shipped

- **Multi-stage Dockerfiles** for backend and frontend — final stages are
  small, run as non-root, and pin base image digests
- **SBOMs** generated with `syft` (CycloneDX format), one per image,
  committed under `sbom/`
- ECR repositories with immutable tags and scan-on-push
- Image tagging strategy: `:sha-<short>` per build, `:latest` never used in
  Kubernetes manifests

## Key files

- `backend/Dockerfile` — Python 3.12-slim → non-root runtime
- `frontend/Dockerfile` — node build → nginx serve
- `sbom/backend.cdx.json`, `sbom/frontend.cdx.json`

## Why it matters

Supply chain is the #1 question on any senior DevOps interview right now.
Having actual SBOMs committed to the repo — not just "we plan to" — is the
evidence that closes the loop.

## Cost

$0 (ECR storage <$1/mo if images are kept).

[:material-arrow-left: Back to phases](index.md)
