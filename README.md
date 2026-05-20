# pos_rocketseat-tech360-financy

Desafio fullstack de organização financeira com:

- Backend: TypeScript + Fastify + GraphQL + Prisma + PostgreSQL
- Frontend: TypeScript + React + Vite + GraphQL

## Estrutura

- `backend/` resolução completa da API
- `frontend/` resolução completa da SPA
- `docker-compose.yml` para ambiente local com PostgreSQL + MinIO (S3-compatible)
- `biome.json` e scripts de qualidade no root
- `frontend/Dockerfile` e `backend/Dockerfile` para execução FullStack via Docker

## Objetivos obrigatórios

- Usuário criar conta e login
- Usuário visualizar e gerenciar somente seus próprios dados
- CRUD de transações
- CRUD de categorias
- Backend e frontend em GraphQL com CORS e `.env.example`
- Upload opcional local suportado via padrão **AWS S3** em container **MinIO**.

### Início rápido

1. Copie `.env.example` para `.env`.
2. Instale dependências:
   - `pnpm install`
3. Gere o client do Prisma:
   - `pnpm prisma:generate`
4. Suba a stack completa (PostgreSQL + MinIO + backend + frontend):
   - `pnpm compose:up`
5. Acesse:
   - Frontend: `http://localhost:5173`
   - Backend GraphQL: `http://localhost:4000/graphql`
   - MinIO Console: `http://localhost:9001`

### Desenvolvimento local sem Docker para apps

- Infra com Docker:
  - `pnpm compose:up`
- Apps localmente:
  - Backend: `pnpm dev:backend`
  - Frontend: `pnpm dev:frontend`

### Scripts úteis

- `pnpm check` valida regras do Biome.
- `pnpm build:backend` gera build do backend.
- `pnpm build:frontend` gera build do frontend.
- `pnpm smoke:graphql` executa smoke do contrato GraphQL (auth + CRUD básico).
- `pnpm compose:logs` acompanha logs da stack.
- `pnpm compose:down` encerra os containers.

### Pipelines de CI

- `ci`: instala dependências, roda `pnpm check`, gera Prisma Client e valida build de backend/frontend.
- `docker-smoke`: sobe a stack completa com `docker compose` e valida disponibilidade de:
  - `http://localhost:4000/health/ready`
  - `http://localhost:5173`
  - fluxo GraphQL smoke (`register`, `login`, `me`, `categories`, `transactions`)

### Endpoints de saúde do backend

- `GET /health`: compatibilidade simples (`status: ok`)
- `GET /health/live`: liveness do processo
- `GET /health/ready`: readiness com verificação de banco (retorna `503` se indisponível)

## Governança

- Licença: MIT
- PR template e checklist em `.github/pull_request_template.md`
- CODEOWNERS em `.github/CODEOWNERS`
- Convenções de branches em `CONTRIBUTING.md`
