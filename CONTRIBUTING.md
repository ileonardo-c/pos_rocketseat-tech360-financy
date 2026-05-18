# Contributing

## Branches

- `feat/<descricao-curta>`
- `fix/<descricao-curta>`
- `chore/<descricao-curta>`

## Antes de abrir PR

- Verificar checklist do desafio na descrição do PR
- Executar:
  - `npm` ou `pnpm` `lint`
  - `npm` ou `pnpm` `typecheck`
  - `npm` ou `pnpm` `build`
- Atualizar `.env.example` quando variáveis mudarem

## Revisão

- PR deve seguir o template em `.github/pull_request_template.md`
- Alterações que mexem em contrato GraphQL devem explicar impacto no frontend
- Revisão de qualidade obrigatória antes do merge
