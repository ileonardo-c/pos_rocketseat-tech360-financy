## Resumo

- [ ] Descreva em 2-3 linhas o que foi alterado
- [ ] Relacione arquivos alterados por pasta (backend/frontend)
- [ ] Se alterou contrato GraphQL, atualize queries/mutations e testes/manual checks relacionados

## Checklist do desafio

## Backend
- [ ] Usuário pode criar conta e fazer login
- [ ] Usuário acessa apenas transações/categorias dele
- [ ] Criar transação
- [ ] Deletar transação
- [ ] Editar transação
- [ ] Listar transações
- [ ] Criar categoria
- [ ] Deletar categoria
- [ ] Editar categoria
- [ ] Listar categorias

## Frontend
- [ ] Página inicial (/) com auth guard (login/dashboard)
- [ ] Login + Signup funcionais
- [ ] CRUD de transações implementado e refletido no estado
- [ ] CRUD de categorias implementado e refletido no estado
- [ ] Apollo Client com Bearer token
- [ ] Página/rota `/categories`, `/transactions`, `/login`, `/signup`, `/profile` conforme guia
- [ ] `.env.example` com `VITE_BACKEND_URL`

## Qualidade
- [ ] `npm/pnpm` scripts de lint/typecheck/build atualizados e executados
- [ ] Validação manual do fluxo autenticado (login + CRUD)
- [ ] Pontos de risco/decisões em `Notas de revisão`

## Observações para o Copilot/Codex
- [ ] Comente qualquer decisão de contrato GraphQL não óbvia
- [ ] Aponte possíveis riscos de segurança (auth, validação, ownership)
