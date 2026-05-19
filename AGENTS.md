# AGENTS.md

## Objective
This repository is a staged monorepo for the Financy challenge. Deliverables are separated in sequential PRs, one domain per PR, to reduce review scope.

## Priorities for Copilot / Reviews
- Prefer minimal, scoped changes in each PR.
- Keep backend and frontend changes in separate PRs unless the step explicitly depends on both.
- Use clear GraphQL interfaces and keep user data isolated by user.

## Local execution baseline
- Backend package: `backend`
- Frontend package: `frontend`
- Root includes `docker-compose.yml` with Postgres and MinIO services.

## Validation expectations per PR
- Monorepo PR: workspace and infra bootstrap only.
- Backend PR: backend starts (`/health`, `/graphql`) and `.env.example` present.
- Auth/category/transaction/frontend PRs: functional isolation by user and CRUD behavior.
