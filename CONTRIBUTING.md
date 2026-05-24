# Contributing

## Objetivo

Padronizar contribuição por domínio, reduzir ruído em revisão e manter rastreabilidade por PR e checklist funcional.

## Convenções de branch

- Use `codex/<tipo>/<escopo-curto>` para branches do fluxo da IA.
- Use `feat/<escopo-curto>`, `fix/<escopo-curto>`, `chore/<escopo-curto>`, `refactor/<escopo-curto>`, `docs/<escopo-curto>` para contribuições gerais.
- Não abra branch para encerrar múltiplos blocos no mesmo PR.

## Convenção de commit

- Siga convencional commit com verbo em minúsculas e diacríticos quando necessário:
  - `feat(frontend): corrige fluxo de login`
  - `fix(auth): remove fallback inseguro de token`
  - `chore(ci): ajusta validação de ambiente`
- Uma mensagem por intenção de entrega; sem mensagens genéricas.

## Estrutura do PR

- O PR deve seguir fielmente o template em [`.github/pull_request_template.md`](.github/pull_request_template.md).
- O corpo do PR deve incluir os blocos de template e remover comentários residuais (`<!-- -->`) antes da publicação.
- Para revisão automatizada de novo ciclo, incluir `@copilot` e `@codex review`.
- Se o PR impactar múltiplos arquivos, documente claramente escopo e motivo por bloco.

## Antes de abrir PR

- Confirmar checklist de requisito e checklist do bloco no escopo.
- Executar:
  - `pnpm check`
  - `pnpm build:backend`
  - `pnpm build:frontend`
  - `pnpm smoke:auth`
  - `pnpm smoke:graphql`
- Validar stack local:
  - `pnpm compose:up`
  - Frontend: `http://localhost:5173`
  - Backend GraphQL: `http://localhost:4000/graphql`
  - Liveness: `http://localhost:4000/health/live`
  - Readiness: `http://localhost:4000/health/ready`
- Rodar validação local de arquivos de ambiente:
  - Copie/atualize `backend/.env.example` e `frontend/.env.example` antes de alterar configuração.
- Atualizar `.env.example` quando variáveis novas forem introduzidas.

## Idioma e documentação técnica

- No chat, comentários e documentação (`*.md`): **português do Brasil com acento completo**.
- Nomes de arquivos e caminhos em documentação: use crase (ex.: ``backend/src/auth-service.ts``).
- Mensagens de erro e logs de runtime: inglês.
- Sem texto técnico de template/placeholder no texto final do PR.

## Segurança e revisão

- Alterações em contrato GraphQL devem indicar impacto explícito no frontend.
- Sem comentários em aberto antes do merge no PR.
- PR só avança com validação de CI sem pendências de bloqueio.
- Não mescle PR enquanto houver bloco funcional em aberto.

## CI e qualidade mínima

- PRs devem passar nos workflows `ci` e `docker-smoke`.
- Evite alterações que gerem artefatos de build fora do controle:
  - backend: `backend/tsconfig.json` com `outDir: "dist"` e `exclude: ["dist"]`
- Dist não deve ser commitado.
