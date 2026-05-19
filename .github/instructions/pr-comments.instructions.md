---
applyTo: "**"
---

Ao escrever comentarios em PR no GitHub:

- Use Markdown renderizavel com secoes curtas.
- Estrutura obrigatoria:
  - `Contexto`
  - `Causa raiz`
  - `Correcao aplicada`
  - `Validacao`
  - `Proximo passo`
- Nao use `\n` literal; use quebra de linha real.
- Valide UTF-8 antes de publicar: sem caracteres corrompidos ou simbolos invalidos.
- Nao exponha secrets, credenciais, tokens, caminhos locais absolutos ou hostnames de ambiente local.
- Em comentarios de resolucao/revalidacao, cite:
  - problema,
  - commit que corrigiu,
  - check afetado.
- Quando a intencao for nova rodada de analise automatica, finalize com `@copilot` e `@codex review`.
