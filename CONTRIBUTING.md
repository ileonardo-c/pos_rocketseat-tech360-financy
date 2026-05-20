# Contributing

## Branches

- `feat/<descricao-curta>`
- `fix/<descricao-curta>`
- `chore/<descricao-curta>`

## Antes de abrir PR

- Verificar checklist do desafio na descrição do PR
- Executar:
  - `pnpm check`
  - `pnpm build:backend`
  - `pnpm build:frontend`
- Atualizar `.env.example` quando variáveis mudarem
- Validar fluxo local com stack:
  - `pnpm compose:up`
  - Frontend em `http://localhost:5173`
  - Backend GraphQL em `http://localhost:4000/graphql`

## Revisão

- PR deve seguir o template em `.github/pull_request_template.md`
- Alterações que mexem em contrato GraphQL devem explicar impacto no frontend
- Revisão de qualidade obrigatória antes do merge
