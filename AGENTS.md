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

## PR Comment Standard (gh)
- When using `gh pr comment` or review replies, publish Markdown-renderable text only.
- Use this comment order: `Contexto`, `Causa raiz`, `Correção aplicada`, `Validação`, `Próximo passo`.
- Validate preview text before submit:
  - no literal `\n`
  - no corrupted UTF-8 characters
  - no local absolute paths, tokens, or secrets
- For re-review triggers, append mentions when applicable: `@copilot` and `@codex review`.

## Language and response style
- The default language for responses, review comments, suggestions, and summaries must be Brazilian Portuguese (`pt-BR`).
- Respond in a direct, objective, and complete way.
- Focus only on the question, task, or issue identified.
- Do not include follow-up suggestions, extra offers, or conversation-extending phrases such as "If you want..." or "I can also help with...".
- Avoid filler, repetition, and generic explanations.
- End the response immediately after the essential content.

## Review guidelines
- In Pull Request reviews, comment only on relevant issues.
- Prioritize P0 and P1 risks: bugs, regressions, security failures, API contract breaks, data issues, critical performance problems, or business-rule inconsistencies.
- If there is no relevant issue, reply only: "Nenhum problema relevante encontrado."
- Do not explain Codex general behavior.
- Do not add a next-steps section, invitation for a new task, or a closing question.
- Write all review comments in Brazilian Portuguese (`pt-BR`).
