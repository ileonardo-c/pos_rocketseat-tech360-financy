# pos_rocketseat-tech360-financy

Desafio fullstack de organização financeira com:

- Backend: TypeScript + Fastify + GraphQL + Prisma + PostgreSQL
- Frontend: TypeScript + React + Vite + GraphQL

## Estrutura

- `backend/` resolução completa da API
- `frontend/` resolução completa da SPA
- `docker-compose.yml` para ambiente local com PostgreSQL + MinIO (S3-compatible)
- `biome.json` e workspace de monorepo para padrão de qualidade e scripts

## Objetivos obrigatórios

- Usuário criar conta e login
- Usuário visualizar e gerenciar somente seus próprios dados
- CRUD de transações
- CRUD de categorias
- Backend e frontend em GraphQL com CORS e `.env.example`
- Upload opcional local suportado via padrão **AWS S3** em container **MinIO**.

## Governança

- Licença: MIT
- PR template e checklist em `.github/pull_request_template.md`
- CODEOWNERS em `.github/CODEOWNERS`
- Convenções de branches em `CONTRIBUTING.md`
