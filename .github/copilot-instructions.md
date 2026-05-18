# Instruções para review de PR (assistente/agent)

- Priorize bugs de segurança, propriedade por usuário e quebra de contrato GraphQL.
- Para cada função de mutação em backend, valide:
  - identidade/autorização do usuário
  - escopo de dados por `user_id`
  - validação de entrada e tratamento de erros.
- Para frontend, valide:
  - estado autenticado persistido e limpo no logout
  - cache/invalidade após mutations (listar/transações/categorias)
  - mensagens de erro e loading states.
- Rejeite merges com alterações de schema não refletidas no frontend sem atualização de contrato.
