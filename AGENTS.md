# AGENTS.md

## Objetivo

Monorepo estruturado em etapas com entregas separadas em PRs sequenciais — um domínio por PR — para manter o escopo de revisão mínimo e focado. A IA atua como um engenheiro autônomo, responsável por entregar código maduro, revisado e livre de falhas básicas de tipagem ou formatação.

Todo o ecossistema (Frontend e Backend) é baseado exclusivamente em Node.js.

------

## Ambiente de Execução — Docker

O projeto opera exclusivamente via Docker Compose. **Nunca execute serviços diretamente no host.**

O arquivo Compose versionado é focado em desenvolvimento local:

| Arquivo                          | Contexto                                                     | Script raiz            |
| -------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `docker-compose.yml`             | Desenvolvimento e CI — hot reload, volumes montados, perfil `e2e` | `pnpm dev`             |

Produção não deve usar o compose local; configure o deploy na plataforma alvo com secrets reais.

Todos os comandos de ciclo de vida, testes e smoke estão definidos em `package.json` (raiz). Consulte os scripts disponíveis antes de invocar `docker compose` diretamente.

### Regra de falha rápida — obrigatória

Todo script de setup ou CI deve iniciar com:

```bash
set -euo pipefail
```

Nunca use `|| true` para suprimir falhas de containers ou serviços. Qualquer saída não-zero interrompe a execução imediatamente.

## Diretrizes Gerais do Repositório e GitHub

- **Referências de Arquivos:** Em respostas no chat, as referências a arquivos devem ser estritamente relativas à raiz do repositório (exemplo: `frontend/src/components/Button.tsx:80`); nunca use caminhos absolutos ou `~/...`.
- **Links Automáticos:** Não envolva referências de Issues/PRs em crases nem em hyperlinks manuais (`[#123](url)`) quando desejar o auto-link do GitHub. Use apenas `#123` — o GitHub resolve automaticamente.
- **Resolução de Threads:** Se um bot ou agente deixar comentários de revisão no seu PR, aplique as correções e resolva as conversas você mesmo. Não deixe a limpeza de conversas de bots para os mantenedores.
- **Commits em PRs:** Ao postar comentários de conclusão de PR, sempre torne os SHAs dos commits clicáveis com links completos.

------

## Estrutura do Projeto e Convenções de Código

- **Testes:** Arquivos de teste devem estar no mesmo diretório do arquivo testado (exemplo: `*.test.ts`).
- **Nomenclatura de Plugins:** Use "plugin" / "plugins" na documentação, interface do usuário e registros de alterações. A árvore de diretórios do espaço de trabalho permanece inalterada para evitar refatorações em massa.
- **Estilo TypeScript:** Prefira tipagem estrita. Evite o uso de `any`. Nunca adicione `@ts-nocheck` e não desabilite `no-explicit-any`; corrija a causa raiz e mantenha a tipagem segura.
- **Boas Práticas de Classes:** Nunca compartilhe comportamento de classe via mutação de protótipo (`Object.defineProperty` em `.prototype`). Use herança ou composição explícitas para que o TypeScript possa validar os tipos.

------

## Padrões de Idioma e Qualidade de Entrega

A separação de idiomas não é preferência estilística — é prevenção de bug. Português sem diacríticos em código (`nao`, `excecao`, `autenticacao`) é simultaneamente português incorreto e inglês inválido, e deve ser tratado como **P1**.

### Regra central: onde cada idioma se aplica

| Contexto                                                     | Idioma obrigatório                   |
| ------------------------------------------------------------ | ------------------------------------ |
| Respostas no chat, comentários de PR, documentação `.md`     | Português do Brasil (UTF-8 completo) |
| `name:` de steps em GitHub Actions / `echo` / mensagens de `run` | Inglês                               |
| `throw new Error / AppError / HttpException`                 | Inglês                               |
| `console.error / warn / log` e qualquer `logger.*`           | Inglês                               |
| Comentários técnicos em `.ts`, `.py`, `.sh`                  | Inglês                               |
| Comentários em `.yml` de CI/CD                               | Inglês                               |

------

### 1. Comunicação e Documentação — Português do Brasil

Todas as respostas no chat, comentários de PR, sugestões e arquivos Markdown voltados a documentação devem ser escritos em `pt-BR`, com qualidade ortográfica absoluta.

A IA nunca omite diacríticos sob pretexto de facilitar encoding ou compatibilidade.

**Obrigatório:**

```
Correção   Validação   Configuração   Autenticação   Exceção   Solução
```

**Proibido:**

```
Correcao   Validacao   Configuracao   Autenticacao   Excecao   Solucao
```

Seja direto e completo. Aborde apenas o que foi perguntado ou identificado. Sem enrolação, sem repetições, sem ofertas de acompanhamento. Encerre imediatamente após o conteúdo essencial.

------

### 2. Código de Aplicação — Inglês

Toda string literal que possa aparecer em logs, respostas de API, stack traces ou saídas de monitoramento deve ser escrita em inglês.

**Proibido:**

```typescript
throw new AppError("Nao autenticado", 401);
throw new AppError("Não autenticado", 401);
console.error("Falha na conexão com o banco");
```

**Obrigatório:**

```typescript
throw new AppError("Unauthenticated", 401);
console.error("Database connection failed");
```

**Motivação:** mensagens de erro circulam por terminais, ferramentas de APM, alertas e buscas em log. Inglês garante rastreabilidade universal e elimina a classe inteira de erros de encoding.

------

### 3. CI/CD e Shell — Inglês

Nomes de steps (`name:`), mensagens de `echo`, saídas de `exit` e comentários em YAML de Actions ou scripts shell devem ser escritos exclusivamente em inglês.

**Proibido:**

```yaml
- name: Aguardar backend
  run: echo "Backend nao respondeu /health em 120s"
```

**Obrigatório:**

```yaml
- name: Wait for backend readiness
  run: echo "Backend did not respond at /health after 120s"
```

------

### 4. Verificação antes do commit

Antes de qualquer commit ou abertura de PR, execute a busca abaixo e corrija toda ocorrência encontrada:

```bash
grep -rn --include="*.ts" --include="*.py" --include="*.yml" --include="*.sh" \
  -E '"[^"]*\b(nao|excecao|autenticacao|configuracao|validacao|solucao|conexao)[^"]*"' \
  .
```

Qualquer ocorrência encontrada nessa busca é um bug **P1** e bloqueia o envio.

------

## Prioridades de Revisão

- Prefira alterações mínimas e com escopo bem definido por PR.
- Mantenha as alterações de backend e frontend em PRs separados, a menos que uma etapa exija explicitamente ambos.
- Prefixe cada apontamento com seu rótulo de severidade. Levante apenas apontamentos de nível P0, P1, P2 ou P3.
- Se nenhum problema relevante for encontrado, responda apenas: `Nenhum problema relevante encontrado.`
- Não explique o comportamento geral do agente, não adicione seções de próximos passos, nem encerre com perguntas abertas.

### Níveis de Severidade

| **Nível** | **Significado**                                        | **Exemplos**                                                 |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `P0`      | Bloqueia a entrega — deve ser corrigido antes do merge | perda de dados, falha na autenticação, crash na inicialização, credenciais expostas |
| `P1`      | Quebra funcionalidade ou segurança — corrija neste PR  | texto sem diacrítico no código (ex: `nao`), regra de negócio incorreta, regressão, falta de *guard* |
| `P2`      | Melhoria importante — corrija ou documente             | falta de índice no banco, edge case não tratado, mensagem de erro ambígua |
| `P3`      | Sugestões de estilo/legibilidade                       | TS em modo estrito, preferência por `unknown` em vez de `any`, `'use client'` apenas onde necessário, imports via alias `@/` |

> Não aponte preferências de estilo, escolhas menores de nomenclatura ou preocupações futuras especulativas como problemas de revisão.

------

## Formato de Comentário no PR

### Quando usar cada formato

| **Situação**                                     | **Formato**                |
| ------------------------------------------------ | -------------------------- |
| Abrindo ou atualizando um PR (novo tópico geral) | Comentário Principal do PR |
| Respondendo a um comentário de revisão existente | Resposta na Thread         |

> **Regra principal:** se existe uma thread de revisão aberta (Codex, Copilot ou humano), a resposta deve ser feita *dentro* dessa thread via `gh api` — nunca como um novo `gh pr comment` separado.

### Corpo do PR (descrição ao abrir o PR)

A estrutura do corpo do PR obedece a uma hierarquia de precedência:

1. **Se existir um template no repositório** (ex: `.github/pull_request_template.md`): O corpo do PR deve seguir estritamente o formato, as seções e o estilo definidos no arquivo. Se o template utilizar emojis em cabeçalhos (ex: 📝, 🔨), eles **devem** ser mantidos.
2. **Se NÃO existir um template no repositório (Fallback):** Utilize as mesmas quatro seções do Comentário Principal (Contexto / Causa / Correção / Validação) e use texto puro (zero emojis).

**Regra inegociável de limpeza:** Independentemente do formato adotado, **nenhuma instrução de template** (como delimitadores `<!-- -->`, mensagens do tipo "Escolha UMA linha", "Não use \n literal" ou "Use nomes de paths em crase"), placeholder vazio ou meta-comentário deve permanecer no corpo publicado. A IA deve ler as instruções invisíveis, aplicá-las e apagá-las do texto final antes de abrir o PR.

**Seção de Screenshots:** O template instrui a apagar a seção se não houver alterações visuais. Escrever `N/A` não é equivalente a apagar — a seção deve ser **removida por completo**. Se o PR implementar alterações visuais e o agente tiver acesso ao Figma via MCP, deve incluir o URL do frame de referência como evidência. Exemplo:

```
[Nome da tela — Figma](https://www.figma.com/file/.../NomeDaTela?node-id=...)
```

### Comentário Principal do PR (novo tópico geral)

Use exatamente estas quatro seções — somente quando não houver thread de revisão prévia sobre o assunto:

```markdown
## Contexto
<referência ao PR, issue ou thread sendo abordada>

## Causa
<causa raiz em 1–2 linhas>

## Correção
<o que mudou e por quê>

## Validação
<evidência: testes passando, threads resolvidas, branch atualizado, próximo passo se houver>
```

**Regras para comentários e threads de revisão:**

- Use texto puro — **sem emoji**. A permissão para emojis aplica-se única e exclusivamente ao corpo do PR quando exigido pelo template. Comentários e threads nunca usam emojis, exceto nas reações via API.
- Use marcadores `*` ou `-` seguidos de texto.
- Nunca inclua `\uFFFD` (U+FFFD) — indica byte UTF-8 corrompido; corrija a origem antes de postar.

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

------

## Reações em Comentários de Revisão

Após processar cada apontamento de revisão (Codex ou Copilot), **duas ações são obrigatórias e inseparáveis** — a reação sem a resposta na thread é considerada incompleta:

| **Resultado**                                       | **Ação obrigatória**                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| Correção aplicada / apontamento procedente          | 1. Reagir 👍 no comentário original. 2. Responder na thread (prosa curta, sem headers). |
| Apontamento rejeitado com justificativa documentada | 1. Reagir 👎 no comentário original. 2. Responder na thread explicando a recusa. |

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

------

## Validação antes de postar qualquer comentário ou corpo de PR

Antes de enviar qualquer comentário ou abrir PR, verifique todos os itens abaixo:

- Nenhuma sequência literal `\n`.
- Nenhum caractere `\uFFFD` (U+FFFD) — indica byte UTF-8 corrompido; corrija a origem antes de postar.
- Nenhum caractere UTF-8 ausente ou corrompido — todos os acentos do pt-BR devem estar presentes.
- Nenhum caminho absoluto local, tokens ou credenciais/segredos.
- Nenhuma instrução de template ou meta-comentário remanescente (ex: "Use nomes de paths em crase", "Não use `\n` literal").
- Bullets de Validação usam texto puro — sem emoji.

------

## Padrões da CLI `gh`

- **Prevenção de Erros (Footgun):** Ao usar `gh issue/pr comment` com conteúdo que contém crases, variáveis ou múltiplos parágrafos, nunca use `-b "..."`. Use sempre strings literais multilinha com *heredoc* (`-F - <<'EOF'`) para evitar corrupção por substituição de shell e *escaping*.
- Use `gh pr create --body-file` com um arquivo UTF-8 (sem BOM). Nunca interpole o corpo via substituição de shell.
- O cabeçalho do corpo do PR deve ser resolvido para exatamente um de:
  - `Closes #<n>` — se este PR fechar a issue referenciada.
  - `Refs #<n>` — se fizer referência sem fechar.
  - Nunca deixe ambos os marcadores; escolha um e remova o outro.

------

## Gatilhos de Revisão Automatizada

- **Acionamento:** Mencione `@copilot` e `@codex review` em um comentário para solicitar uma nova análise automatizada.
- **Sincronização Inicial:** Aguarde o tempo padrão de sincronização após a criação do PR antes de solicitar a primeira revisão.
- **Tratamento de Erros (`missing refs/pull/<n>/head`):**
  1. Valide a referência remota: `git ls-remote origin refs/pull/<n>/*`
  2. Atualize o estado do PR via um novo push ou comentário.
  3. Acione a revisão novamente.
