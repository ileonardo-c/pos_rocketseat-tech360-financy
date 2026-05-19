# AGENTS.md

## Objetivo

Monorepo estruturado em etapas com entregas separadas em PRs sequenciais — um domínio por PR — para manter o escopo de revisão mínimo e focado.

Todo o ecossistema (Frontend e Backend) é baseado exclusivamente em Node.js.

---

## Diretrizes Gerais do Repositório e GitHub

- **Referências de Arquivos:** Em respostas no chat, as referências a arquivos devem ser estritamente relativas à raiz do repositório (exemplo: `frontend/src/components/Button.tsx:80`); nunca use caminhos absolutos ou `~/...`.
- **Links Automáticos:** Não envolva referências de Issues/PRs em crases quando desejar o auto-link do GitHub. Use apenas `#123` em vez de `#123`.
- **Resolução de Threads:** Se um bot ou agente deixar comentários de revisão no seu PR, aplique as correções e resolva as conversas você mesmo. Não deixe a limpeza de conversas de bots para os mantenedores.
- **Commits em PRs:** Ao postar comentários de conclusão de PR, sempre torne os SHAs dos commits clicáveis com links completos.

## Estrutura do Projeto e Convenções de Código

- **Testes:** Arquivos de teste devem estar no mesmo diretório do arquivo testado (exemplo: `*.test.ts`).
- **Nomenclatura de Plugins:** Use "plugin" / "plugins" na documentação, interface do usuário e registros de alterações. A árvore de diretórios do espaço de trabalho permanece inalterada para evitar refatorações em massa.
- **Estilo TypeScript:** Prefira tipagem estrita. Evite o uso de `any`. Nunca adicione `@ts-nocheck` e não desabilite `no-explicit-any`; corrija a causa raiz e mantenha a tipagem segura.
- **Boas Práticas de Classes:** Nunca compartilhe comportamento de classe via mutação de protótipo (`Object.defineProperty` em `.prototype`). Use herança ou composição explícitas para que o TypeScript possa validar os tipos.

---

## Prioridades de Revisão

- Prefira alterações mínimas e com escopo bem definido por PR.
- Mantenha as alterações de backend e frontend em PRs separados, a menos que uma etapa exija explicitamente ambos.
- Prefixe cada apontamento com seu rótulo de severidade. Levante apenas apontamentos de nível P0, P1, P2 ou P3.
- Se nenhum problema relevante for encontrado, responda apenas: `Nenhum problema relevante encontrado.`
- Não explique o comportamento geral do agente, não adicione seções de próximos passos, nem encerre com perguntas abertas.

### Níveis de Severidade

| Nível | Significado                                                  | Exemplos                                                     |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `P0`  | Bloqueia a entrega — deve ser corrigido antes do merge       | perda de dados, falha na autenticação, crash na inicialização, credenciais expostas |
| `P1`  | Quebra funcionalidade ou segurança — corrija neste PR        | regra de negócio incorreta, quebra de contrato de API, regressão, falta de *guard* de autenticação |
| `P2`  | Melhoria importante — corrija ou documente antes de fechar o domínio | falta de índice em coluna consultada, caso extremo (edge case) não tratado, mensagem de erro enganosa |
| `P3`  | Sugestões de estilo/legibilidade                             | TypeScript: modo estrito, sem `any`, preferência por `unknown` para dados externos; React: componentes do servidor por padrão, `'use client'` apenas para interatividade; CSS: classes utilitárias do Tailwind; sem estilos inline, exceto para valores dinâmicos; Imports: caminhos absolutos via alias `@/`, não relativos para importações entre módulos. |

> Não aponte preferências de estilo, escolhas menores de nomenclatura ou preocupações futuras especulativas como problemas de revisão.

---

## Idioma e Estilo de Resposta

- Todas as respostas, comentários de revisão, sugestões e resumos devem ser escritos em Português do Brasil (`pt-BR`).
- Sempre use a acentuação correta do pt-BR. Nunca omita os acentos.
  - ✅ `Correção`, `Validação`, `Configuração`, `Autenticação`, `Solução`
  - ❌ `Correcao`, `Validacao`, `Configuracao`, `Autenticacao`, `Solucao`
- Seja direto, objetivo e completo. Aborde apenas o que foi perguntado ou identificado.
- Sem enrolação, sem repetições, sem explicações genéricas.
- Sem ofertas de acompanhamento ou frases que prolonguem a conversa (`"Se você quiser..."`, `"Eu também posso..."`).
- Encerre imediatamente após o conteúdo essencial.

---

## Formato de Comentário no PR

### Quando usar cada formato

| Situação                                         | Formato                    |
| ------------------------------------------------ | -------------------------- |
| Abrindo ou atualizando um PR (novo tópico geral) | Comentário Principal do PR |
| Respondendo a um comentário de revisão existente | Resposta na Thread         |

> **Regra principal:** se existe uma thread de revisão aberta (Codex, Copilot ou humano), a resposta deve ser feita *dentro* dessa thread via `gh api` — nunca como um novo `gh pr comment` separado.

---

### Comentário Principal do PR (novo tópico geral)

Use exatamente estas quatro seções — somente quando não houver thread de revisão prévia sobre o assunto:

```md
## Contexto
<referência ao PR, issue ou thread sendo abordada>

## Causa
<causa raiz em 1–2 linhas>

## Correção
<o que mudou e por quê>

## Validação
<evidência: testes passando, threads resolvidas, branch atualizado, próximo passo se houver>
```

### Resposta em uma Thread de revisão existente

Use prosa curta — sem títulos (headers) — postando diretamente na thread com `gh api`:

```markdown
Concordo com o risco. Correção aplicada: <resumo>. <evidência se relevante>.
```

Comandos de referência:

```bash
# Listar comentários de revisão (review comments) com IDs
gh api repos/{owner}/{repo}/pulls/{pr}/comments

# Responder dentro da thread
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies \
  -X POST -f body="Concordo com o risco. Correção aplicada: <resumo>."

# Resolver a conversa (GraphQL)
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: { threadId: "<thread_node_id>" }) {
      thread { isResolved }
    }
  }
'
```

## Reações em Comentários de Revisão

Após processar cada apontamento (finding) de revisão (Codex ou Copilot):

| **Resultado**                                       | **Ação**                        |
| --------------------------------------------------- | ------------------------------- |
| Correção aplicada / apontamento procedente          | Reagir 👍 no comentário original |
| Apontamento rejeitado com justificativa documentada | Reagir 👎 no comentário original |

Comandos de referência:

```bash
# 👍 — apontamento aceito e corrigido
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions \
  -X POST -f content="+1"

# 👎 — apontamento rejeitado com justificativa
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions \
  -X POST -f content="-1"
```

> Reaja **antes** de postar a resposta na thread, para que a confirmação visual apareça junto com a resposta.

### Ordem de operações ao responder a um apontamento

1. Aplicar (ou recusar) a correção no código.
2. Reagir 👍 ou 👎 no comentário original via `gh api`.
3. Responder dentro da thread (prosa curta, sem headers).
4. Postar um único Comentário Principal no PR referenciando todas as threads tratadas no ciclo.

## Padrões da CLI `gh`

- **Prevenção de Erros (Footgun):** Ao usar `gh issue/pr comment` com conteúdo que contém crases, variáveis ou múltiplos parágrafos, nunca use `-b "..."`. Use sempre strings literais multilinha com *heredoc* (`-F - <<'EOF'`) para evitar corrupção por substituição de shell e *escaping*.
- Antes de enviar qualquer comentário ou corpo de PR, valide:
  - Nenhuma sequência literal `\n`.
  - Nenhum caractere UTF-8 ausente ou corrompido — todos os acentos do pt-BR devem estar presentes.
  - Nenhum caminho absoluto local, tokens ou credenciais/segredos.
- Use `gh pr create --body-file` com um arquivo UTF-8 (sem BOM). Nunca interpole o corpo via substituição de shell.
- O cabeçalho do corpo do PR deve ser resolvido para exatamente um de:
  - `Closes #<n>` — se este PR fechar a issue referenciada.
  - `Refs #<n>` — se fizer referência sem fechar.
  - Nunca deixe ambos os marcadores; escolha um e remova o outro.

## Gatilhos de Revisão Automatizada

- **Acionamento:** Mencione `@copilot` e `@codex review` em um comentário para solicitar uma nova análise automatizada.
- **Sincronização Inicial:** Aguarde o tempo padrão de sincronização após a criação do PR antes de solicitar a primeira revisão.
- **Tratamento de Erros (`missing refs/pull/<n>/head`):**
  1. Valide a referência remota: `git ls-remote origin refs/pull/<n>/*`
  2. Atualize o estado do PR via um novo push ou comentário.
  3. Acione a revisão novamente.
  