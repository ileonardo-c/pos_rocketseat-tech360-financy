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

## Portas e serviços

- `frontend`: `http://localhost:5173`
- `backend/graphql`: `http://localhost:4000/graphql`
- `backend/health`: `http://localhost:4000/health/ready`
- `postgres`: `localhost:5432`
- `minio-api`: `http://localhost:9000`
- `minio-console`: `http://localhost:9001`

## Objetivos obrigatórios

- Usuário criar conta e login
- Usuário visualizar e gerenciar somente seus próprios dados
- CRUD de transações
- CRUD de categorias
- Backend e frontend em GraphQL com CORS e `.env.example`
- Upload opcional local suportado via padrão **AWS S3** em container **MinIO**.

## Variáveis de ambiente

Backend (`backend/.env.example`):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_FORCE_PATH_STYLE`

Frontend (`frontend/.env.example`):

- `VITE_BACKEND_URL`

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
- `pnpm smoke:auth` executa cenários negativos e positivos de autenticação/sessão (token ausente, token inválido, usuário inexistente, senha inválida e sessão válida).
- `pnpm smoke:auth:browser` executa fluxo de autenticação no browser (cadastro, login, logout, sessão persistida e bloqueio com token inválido).
- `pnpm compose:logs` acompanha logs da stack.
- `pnpm compose:down` encerra os containers.

### Validação padrão de entrega

Executar antes de abrir PR:

1. `pnpm check`
2. `pnpm build:backend`
3. `pnpm build:frontend`
4. `pnpm smoke:graphql`
5. `pnpm smoke:auth`
6. `pnpm smoke:auth:browser`

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

## Matriz de cobertura por bloco

| Bloco | Backend | Frontend | Integração | Evidência |
| --- | --- | --- | --- | --- |
| A — Autenticação e sessão | `register`, `login`, `me`, JWT/contexto | login/cadastro/logout e guardas | smoke auth + browser auth | `pnpm smoke:auth`, `pnpm smoke:auth:browser` |
| B — Categorias | CRUD com ownership por `userId` | listagem/criação/edição/remoção | fluxo GraphQL de domínio | `pnpm smoke:graphql` |
| C — Transações | CRUD com vínculo de categoria e ownership | listagem/criação/edição/remoção | fluxo GraphQL de domínio | `pnpm smoke:graphql` |
| D — Dashboard e consolidação | resumo e consultas consolidadas | dashboard e navegação protegida | persistência de sessão e navegação | `pnpm smoke:auth:browser` |
| E — Infra e storage | S3-compatible upload URL + health/readiness | consumo da API e sessão | compose + smoke E2E | `pnpm compose:up`, `pnpm smoke:*` |

## Governança

- Licença: MIT
- PR template e checklist em `.github/pull_request_template.md`
- CODEOWNERS em `.github/CODEOWNERS`
- Convenções de branches em `CONTRIBUTING.md`
- Checklist de governança de finalização em `docs/finalization-governance-checklist.md`
