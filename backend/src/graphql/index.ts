import type { Transaction } from "@prisma/client";
import { authMutations } from "./mutations/auth";
import { categoryMutations } from "./mutations/category";
import { storageMutations } from "./mutations/storage";
import { transactionMutations } from "./mutations/transaction";
import { authQueries } from "./queries/auth";
import { categoryQueries } from "./queries/category";
import { transactionQueries } from "./queries/transaction";

export const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    avatarUrl: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type RegisterPayload {
    created: Boolean!
    user: User!
  }

  type Category {
    id: ID!
    name: String!
    description: String!
    icon: String!
    color: String!
    transactionsCount: Int!
    userId: ID!
  }

  type CategoryOverviewMostUsed {
    id: ID!
    name: String!
    icon: String!
    color: String!
    count: Int!
  }

  type CategoriesOverview {
    totalCategories: Int!
    totalTransactions: Int!
    mostUsedCategory: CategoryOverviewMostUsed
  }

  type Transaction {
    id: ID!
    title: String!
    description: String
    amount: Float!
    type: String!
    date: String!
    receiptKey: String
    receiptUrl: String
    userId: ID!
    categoryId: ID!
    category: Category
    createdAt: String!
    updatedAt: String!
  }

  type TransactionTypeSummary {
    type: String!
    total: Float!
    count: Int!
  }

  type TransactionSummary {
    incomeTotal: Float!
    expenseTotal: Float!
    balance: Float!
    totalCount: Int!
    byType: [TransactionTypeSummary!]!
  }

  type TransactionCategorySummary {
    categoryId: ID!
    categoryName: String!
    total: Float!
    count: Int!
    incomeTotal: Float!
    expenseTotal: Float!
    balance: Float!
  }

  type TransactionTimelinePoint {
    period: String!
    incomeTotal: Float!
    expenseTotal: Float!
    balance: Float!
    cumulativeBalance: Float!
    count: Int!
  }

  enum TransactionsInitialPeriodSource {
    LATEST_TRANSACTION
    CURRENT_MONTH
  }

  type TransactionsInitialPeriod {
    from: String!
    to: String!
    source: TransactionsInitialPeriodSource!
  }

  enum TransactionTimelineInterval {
    DAY
    MONTH
  }

  enum TransactionSortField {
    DATE
    AMOUNT
    TITLE
  }

  enum SortDirection {
    ASC
    DESC
  }

  """
  Dados necessários para criar uma nova conta.
  """
  input RegisterInput {
    """
    Nome completo exibido no perfil.
    """
    name: String!
    """
    E-mail único usado para autenticação.
    """
    email: String!
    """
    Senha de acesso da conta.
    """
    password: String!
  }

  """
  Credenciais para iniciar sessão.
  """
  input LoginInput {
    """
    E-mail cadastrado na conta.
    """
    email: String!
    """
    Senha da conta.
    """
    password: String!
    """
    Persistir sessão no navegador.
    """
    rememberMe: Boolean
  }

  """
  Dados para solicitar código de recuperação de senha.
  """
  input RequestPasswordResetInput {
    """
    E-mail da conta que receberá o código OTP.
    """
    email: String!
  }

  """
  Dados para confirmar a recuperação e definir nova senha.
  """
  input ResetPasswordInput {
    """
    E-mail da conta em recuperação.
    """
    email: String!
    """
    Código OTP recebido por e-mail.
    """
    code: String!
    """
    Nova senha que substituirá a senha atual.
    """
    newPassword: String!
  }

  """
  Campos permitidos para atualização de perfil.
  """
  input UpdateProfileInput {
    """
    Novo nome completo do usuário.
    """
    name: String
    """
    E-mail do usuário (somente leitura nesta API).
    """
    email: String
  }

  """
  Chave do arquivo de avatar já enviado ao storage.
  """
  input UpdateProfileAvatarInput {
    """
    Chave final do objeto no bucket (ex.: users/{userId}/...).
    """
    avatarKey: String!
  }

  """
  Dados para criar uma categoria.
  """
  input CreateCategoryInput {
    """
    Nome da categoria.
    """
    name: String!
    """
    Descrição opcional da categoria.
    """
    description: String
    """
    Identificador do ícone da categoria.
    """
    icon: String
    """
    Cor da categoria (token ou valor suportado pela aplicação).
    """
    color: String
  }

  """
  Dados para atualizar uma categoria existente.
  """
  input UpdateCategoryInput {
    """
    Novo nome da categoria.
    """
    name: String
    """
    Nova descrição da categoria.
    """
    description: String
    """
    Novo identificador de ícone.
    """
    icon: String
    """
    Nova cor da categoria.
    """
    color: String
  }

  """
  Dados para criar uma transação.
  """
  input CreateTransactionInput {
    """
    Título curto da transação.
    """
    title: String!
    """
    Descrição detalhada opcional.
    """
    description: String
    """
    Valor monetário da transação.
    """
    amount: Float!
    """
    Tipo da transação (ex.: INCOME ou EXPENSE).
    """
    type: String!
    """
    Data da transação no formato ISO.
    """
    date: String!
    """
    Identificador da categoria vinculada.
    """
    categoryId: String!
    """
    Chave do comprovante no storage (quando houver).
    """
    receiptKey: String
    """
    URL pública do comprovante (quando houver).
    """
    receiptUrl: String
  }

  """
  Dados para atualização parcial de uma transação.
  """
  input UpdateTransactionInput {
    """
    Novo título da transação.
    """
    title: String
    """
    Nova descrição da transação.
    """
    description: String
    """
    Novo valor da transação.
    """
    amount: Float
    """
    Novo tipo da transação.
    """
    type: String
    """
    Nova data da transação no formato ISO.
    """
    date: String
    """
    Nova categoria vinculada.
    """
    categoryId: String
    """
    Nova chave de comprovante no storage.
    """
    receiptKey: String
    """
    Nova URL pública de comprovante.
    """
    receiptUrl: String
  }

  """
  Dados para solicitar URL assinada de upload de comprovante.
  """
  input UploadInput {
    """
    Nome original do arquivo.
    """
    fileName: String!
    """
    MIME type do comprovante (PDF, JPEG, PNG ou WebP).
    """
    contentType: String!
    """
    Tamanho do arquivo em bytes.
    """
    sizeBytes: Int!
  }

  """
  Dados para solicitar upload de foto de perfil.
  """
  input ProfileAvatarUploadInput {
    """
    Nome original do arquivo de avatar.
    """
    fileName: String!
    """
    MIME type do avatar.
    """
    contentType: String!
    """
    Tamanho do arquivo em bytes.
    """
    sizeBytes: Int!
  }

  """
  Filtro temporal usado em resumos e gráficos.
  """
  input TransactionSummaryFilterInput {
    """
    Data inicial do período (YYYY-MM-DD).
    """
    from: String
    """
    Data final do período (YYYY-MM-DD).
    """
    to: String
  }

  """
  Filtro de listagem de transações.
  """
  input TransactionListFilterInput {
    """
    Termo textual para busca por título/descrição.
    """
    query: String
    """
    Tipo da transação para filtro.
    """
    type: String
    """
    Categoria específica para filtro.
    """
    categoryId: ID
    """
    Data inicial do período (YYYY-MM-DD).
    """
    from: String
    """
    Data final do período (YYYY-MM-DD).
    """
    to: String
  }

  """
  Configuração de ordenação da listagem de transações.
  """
  input TransactionSortInput {
    """
    Campo usado para ordenar os resultados.
    """
    field: TransactionSortField = DATE
    """
    Direção da ordenação.
    """
    direction: SortDirection = DESC
  }

  type UploadPayload {
    url: String!
    key: String!
    publicUrl: String!
    expiresIn: Int!
  }

  """
  Operações de leitura da API.
  """
  type Query {
    """
    Retorna o usuário autenticado na sessão atual.
    """
    me: User
    """
    Lista todas as categorias do usuário autenticado.
    """
    categories: [Category!]!
    """
    Lista categorias com paginação.
    """
    categoriesList(page: Int = 1, perPage: Int = 8): [Category!]!
    """
    Retorna a quantidade total de categorias do usuário.
    """
    categoriesCount: Int!
    """
    Retorna métricas consolidadas de categorias.
    """
    categoriesOverview: CategoriesOverview!
    """
    Resolve o período inicial de transações com regra backend-first.
    """
    transactionsInitialPeriod: TransactionsInitialPeriod!
    """
    Lista transações com filtros, ordenação e paginação.
    """
    transactions(
      filter: TransactionListFilterInput
      sort: TransactionSortInput
      page: Int = 1
      perPage: Int = 10
    ): [Transaction!]!
    """
    Retorna a contagem total de transações no filtro informado.
    """
    transactionsCount(filter: TransactionListFilterInput): Int!
    """
    Lista as transações mais recentes para o dashboard.
    """
    dashboardRecentTransactions(
      filter: TransactionSummaryFilterInput
      limit: Int = 5
    ): [Transaction!]!
    """
    Retorna resumo consolidado de receitas, despesas e saldo.
    """
    transactionSummary(filter: TransactionSummaryFilterInput): TransactionSummary!
    """
    Retorna resumo agrupado por categoria.
    """
    transactionCategorySummary(
      filter: TransactionSummaryFilterInput
      limit: Int
    ): [TransactionCategorySummary!]!
    """
    Retorna série temporal de evolução das transações.
    """
    transactionTimeline(
      filter: TransactionSummaryFilterInput
      interval: TransactionTimelineInterval
    ): [TransactionTimelinePoint!]!
  }

  """
  Operações de escrita da API.
  """
  type Mutation {
    """
    Cria uma nova conta de usuário.
    """
    register(input: RegisterInput!): RegisterPayload!
    """
    Autentica usuário e retorna token de sessão.
    """
    login(input: LoginInput!): AuthPayload!
    """
    Encerra sessão atual removendo cookie de autenticação.
    """
    logout: Boolean!
    """
    Atualiza dados permitidos do perfil do usuário.
    """
    updateProfile(input: UpdateProfileInput!): User!
    """
    Solicita URL assinada para upload de avatar.
    """
    requestProfileAvatarUploadUrl(input: ProfileAvatarUploadInput!): UploadPayload!
    """
    Confirma e salva o avatar enviado.
    """
    updateProfileAvatar(input: UpdateProfileAvatarInput!): User!
    """
    Remove a foto de perfil atual.
    """
    removeProfileAvatar: User!
    """
    Solicita código OTP para recuperação de senha.
    """
    requestPasswordReset(input: RequestPasswordResetInput!): Boolean!
    """
    Valida OTP e redefine a senha da conta.
    """
    resetPassword(input: ResetPasswordInput!): Boolean!
    """
    Cria uma nova categoria.
    """
    createCategory(input: CreateCategoryInput!): Category!
    """
    Atualiza uma categoria existente.
    """
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    """
    Exclui uma categoria pelo identificador.
    """
    deleteCategory(id: ID!): Boolean!
    """
    Cria uma nova transação.
    """
    createTransaction(input: CreateTransactionInput!): Transaction!
    """
    Atualiza uma transação existente.
    """
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    """
    Exclui uma transação pelo identificador.
    """
    deleteTransaction(id: ID!): Boolean!
    """
    Solicita URL assinada para upload de comprovante.
    """
    requestUploadUrl(input: UploadInput!): UploadPayload!
  }
`;

export const resolvers = {
  Query: {
    ...authQueries,
    ...categoryQueries,
    ...transactionQueries,
  },
  Mutation: {
    ...authMutations,
    ...categoryMutations,
    ...transactionMutations,
    ...storageMutations,
  },
  Category: {
    transactionsCount: (category: {
      transactionsCount?: number;
      _count?: { transactions?: number };
    }) => {
      if (typeof category.transactionsCount === "number") {
        return category.transactionsCount;
      }
      if (typeof category._count?.transactions === "number") {
        return category._count.transactions;
      }
      return 0;
    },
  },
  Transaction: {
    date: ({ date }: Transaction) => date.toISOString(),
    createdAt: ({ createdAt }: Transaction) => createdAt.toISOString(),
    updatedAt: ({ updatedAt }: Transaction) => updatedAt.toISOString(),
  },
};
