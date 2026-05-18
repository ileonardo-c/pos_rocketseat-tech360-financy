#!/usr/bin/env bash
set -euo pipefail

echo "=== Setup rápido de ferramentas de apoio (Financy) ==="
echo
echo "1) Verificações locais"
node --version
git --version
gh --version
echo

echo "2) Autenticação GitHub (pré-requisito)"
gh auth status
echo

echo "3) Arquivos de contexto para agentes"
echo " - study-notes.md (análise local, não comitar)"
echo " - README.md"
echo " - .github/REPOSITORY_SETUP.md"
echo " - .github/copilot-instructions.md"
echo

echo "4) Instalação de convenções (opcional)"
echo " - Configure o plugin Copilot Review de PR pela UI do GitHub se disponível no plano."
echo " - Atualize CODEOWNERS/PR template conforme necessidade da sua equipe."
echo

echo "5) Próximos comandos úteis"
echo " - gh repo view ileonardo-c/pos_rocketseat-tech360-financy --json nameWithOwner,visibility,isPrivate"
echo " - gh api repos/ileonardo-c/pos_rocketseat-tech360-financy/branches/main/protection"
echo
