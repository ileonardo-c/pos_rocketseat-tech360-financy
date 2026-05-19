# AGENTS.md

## Objective

Staged monorepo with deliverables separated into sequential PRs — one domain per PR — to keep review scope minimal and focused.

---

## Review Priorities

- Prefer minimal, scoped changes per PR.
- Keep backend and frontend changes in separate PRs unless a step explicitly requires both.
- Prefix every finding with its severity label. Only raise findings at P0, P1, or P2.
- If no relevant issue is found, reply only: `Nenhum problema relevante encontrado.`
- Do not explain agent general behavior, add next-steps sections, or close with open-ended questions.

### Severity Levels

| Level | Meaning | Examples |
|-------|---------|---------|
| `P0` | Blocks delivery — must be fixed before merge | data loss, broken auth, crash on startup, exposed secrets |
| `P1` | Breaks functionality or security — fix in this PR | wrong business logic, API contract break, regression, missing auth guard |
| `P2` | Important improvement — fix or document before closing the domain | missing index on queried column, unhandled edge case, misleading error message |

> Do not raise style preferences, minor naming choices, or speculative future concerns as findings.

---

## Language and Response Style

- All responses, review comments, suggestions, and summaries must be written in Brazilian Portuguese (`pt-BR`).
- Always use correct pt-BR diacritics. Never drop accents.
  - ✅ `Correção`, `Validação`, `Configuração`, `Autenticação`, `Solução`
  - ❌ `Correcao`, `Validacao`, `Configuracao`, `Autenticacao`, `Solucao`
- Be direct, objective, and complete. Address only what was asked or identified.
- No filler, no repetition, no generic explanations.
- No follow-up offers or conversation-extending phrases (`"If you want..."`, `"I can also..."`).
- End immediately after the essential content.

---

## PR Comment Format

### Main PR comment (new thread)

Use exactly these four sections:

```
## Contexto
<reference to the PR, issue, or review thread being addressed>

## Causa
<root cause in 1–2 lines>

## Correção
<what changed and why>

## Validação
<evidence: tests passing, threads resolved, branch updated, next step if any>
```

### Reply in an existing review thread

Use short prose — no headers:

```
Concordo com o risco. Correção aplicada: <summary>. <evidence if relevant>.
```

---

## `gh` CLI Standards

- Publish Markdown-renderable text only via `gh pr comment` or review replies.
- Before submitting any comment or PR body, validate:
  - No literal `\n` sequences.
  - No corrupted or missing UTF-8 characters — all pt-BR accents must be present.
  - No local absolute paths, tokens, or secrets.
- Use `gh pr create --body-file` with a UTF-8 (no BOM) file. Never interpolate the body via shell substitution.
- The PR body header must resolve to exactly one of:
  - `Closes #<n>` — if this PR closes the referenced issue.
  - `Refs #<n>` — if it references without closing.
  - Never leave both placeholders; pick one and remove the other.

---

## Automated Review Triggers

- **Triggering:** Mention `@copilot` and `@codex review` in a comment to request a new automated pass.
- **Initial Sync:** Allow standard synchronization time after PR creation before requesting the first review.
- **Error Handling (`missing refs/pull/<n>/head`):**
  1. Validate the remote reference: `git ls-remote origin refs/pull/<n>/*`
  2. Update the PR state via a new push or comment.
  3. Re-trigger the review.