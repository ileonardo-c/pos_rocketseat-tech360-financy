# Repository Setup Runbook (Financy)

## 1) Estado inicial do repositório

- Repositório criado como privado: `pos_rocketseat-tech360-financy`
- Objetivo: scaffold de backend + frontend + padrão de PR + governança

## 2) Estrutura obrigatória

```text
backend/
frontend/
README.md
LICENSE
CONTRIBUTING.md
.github/
```

## 3) Branch inicial

1. Trabalhar na branch `main` (padrão)
2. Push inicial com arquivos base de governança
3. Abrir PR de bootstrap de governança antes de iniciar as features

## 4) Proteção de branch (pendente de aplicação após `main` existir)

Arquivo versionado: `.github/policies/branch-protection-main.json`  
Script:
- ` .github/scripts/apply-branch-protection.ps1` (Windows)
- ` .github/scripts/apply-branch-protection.sh` (Unix)

## 5) Revisão automática de PR

- Revisão automática com agente/copiilot deve ser habilitada no GitHub UI do repositório quando você validar a licença/plano.
- O template de PR já força checklist de checklist do desafio em `.github/pull_request_template.md`.
- `CODEOWNERS` está configurado para `@ileonardo-c`.

## 6) Checkpoint

- Após configuração, usar `gh api` de proteção para validar os campos de branch protection antes dos merges obrigatórios.
