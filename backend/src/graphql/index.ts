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
  Data required to create a new account.
  """
  input RegisterInput {
    """
    Full name displayed in the profile.
    """
    name: String!
    """
    Unique email address used for authentication.
    """
    email: String!
    """
    Account password.
    """
    password: String!
  }

  """
  Credentials used to sign in.
  """
  input LoginInput {
    """
    Email address registered for the account.
    """
    email: String!
    """
    Account password.
    """
    password: String!
    """
    Persist the session in the browser.
    """
    rememberMe: Boolean
  }

  """
  Data used to request a password reset code.
  """
  input RequestPasswordResetInput {
    """
    Account email address that will receive the OTP code.
    """
    email: String!
  }

  """
  Data used to confirm recovery and set a new password.
  """
  input ResetPasswordInput {
    """
    Email address of the account being recovered.
    """
    email: String!
    """
    OTP code received by email.
    """
    code: String!
    """
    New password that will replace the current password.
    """
    newPassword: String!
  }

  """
  Fields allowed for profile updates.
  """
  input UpdateProfileInput {
    """
    New full name for the user.
    """
    name: String
    """
    User email address (read-only in this API).
    """
    email: String
  }

  """
  Key of the avatar file already uploaded to storage.
  """
  input UpdateProfileAvatarInput {
    """
    Final object key in the bucket (for example, users/{userId}/...).
    """
    avatarKey: String!
  }

  """
  Data used to create a category.
  """
  input CreateCategoryInput {
    """
    Category name.
    """
    name: String!
    """
    Optional category description.
    """
    description: String
    """
    Category icon identifier.
    """
    icon: String
    """
    Category color (token or value supported by the application).
    """
    color: String
  }

  """
  Data used to update an existing category.
  """
  input UpdateCategoryInput {
    """
    New category name.
    """
    name: String
    """
    New category description.
    """
    description: String
    """
    New icon identifier.
    """
    icon: String
    """
    New category color.
    """
    color: String
  }

  """
  Data used to create a transaction.
  """
  input CreateTransactionInput {
    """
    Short transaction title.
    """
    title: String!
    """
    Optional detailed description.
    """
    description: String
    """
    Transaction amount.
    """
    amount: Float!
    """
    Transaction type (for example, INCOME or EXPENSE).
    """
    type: String!
    """
    Transaction date in ISO format.
    """
    date: String!
    """
    Identifier of the linked category.
    """
    categoryId: String!
    """
    Receipt key in storage, when available.
    """
    receiptKey: String
    """
    Public receipt URL, when available.
    """
    receiptUrl: String
  }

  """
  Data used for partial transaction updates.
  """
  input UpdateTransactionInput {
    """
    New transaction title.
    """
    title: String
    """
    New transaction description.
    """
    description: String
    """
    New transaction amount.
    """
    amount: Float
    """
    New transaction type.
    """
    type: String
    """
    New transaction date in ISO format.
    """
    date: String
    """
    New linked category.
    """
    categoryId: String
    """
    New receipt key in storage.
    """
    receiptKey: String
    """
    New public receipt URL.
    """
    receiptUrl: String
  }

  """
  Data used to request a signed receipt upload URL.
  """
  input UploadInput {
    """
    Original file name.
    """
    fileName: String!
    """
    Receipt MIME type (PDF, JPEG, PNG, or WebP).
    """
    contentType: String!
    """
    File size in bytes.
    """
    sizeBytes: Int!
  }

  """
  Data used to request a profile photo upload.
  """
  input ProfileAvatarUploadInput {
    """
    Original avatar file name.
    """
    fileName: String!
    """
    Avatar MIME type.
    """
    contentType: String!
    """
    File size in bytes.
    """
    sizeBytes: Int!
  }

  """
  Date range filter used in summaries and charts.
  """
  input TransactionSummaryFilterInput {
    """
    Start date of the period (YYYY-MM-DD).
    """
    from: String
    """
    End date of the period (YYYY-MM-DD).
    """
    to: String
  }

  """
  Filter used for transaction listings.
  """
  input TransactionListFilterInput {
    """
    Text term used to search by title or description.
    """
    query: String
    """
    Transaction type filter.
    """
    type: String
    """
    Specific category filter.
    """
    categoryId: ID
    """
    Start date of the period (YYYY-MM-DD).
    """
    from: String
    """
    End date of the period (YYYY-MM-DD).
    """
    to: String
  }

  """
  Sort configuration for transaction listings.
  """
  input TransactionSortInput {
    """
    Field used to sort the results.
    """
    field: TransactionSortField = DATE
    """
    Sort direction.
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
  Read operations exposed by the API.
  """
  type Query {
    """
    Returns the authenticated user for the current session.
    """
    me: User
    """
    Lists all categories for the authenticated user.
    """
    categories: [Category!]!
    """
    Lists categories with pagination.
    """
    categoriesList(page: Int = 1, perPage: Int = 8): [Category!]!
    """
    Returns the total number of categories for the user.
    """
    categoriesCount: Int!
    """
    Returns consolidated category metrics.
    """
    categoriesOverview: CategoriesOverview!
    """
    Resolves the initial transaction period using backend-first rules.
    """
    transactionsInitialPeriod: TransactionsInitialPeriod!
    """
    Lists transactions with filters, sorting, and pagination.
    """
    transactions(
      filter: TransactionListFilterInput
      sort: TransactionSortInput
      page: Int = 1
      perPage: Int = 10
    ): [Transaction!]!
    """
    Returns the total transaction count for the provided filter.
    """
    transactionsCount(filter: TransactionListFilterInput): Int!
    """
    Lists the most recent transactions for the dashboard.
    """
    dashboardRecentTransactions(
      filter: TransactionSummaryFilterInput
      limit: Int = 5
    ): [Transaction!]!
    """
    Returns a consolidated summary of income, expenses, and balance.
    """
    transactionSummary(filter: TransactionSummaryFilterInput): TransactionSummary!
    """
    Returns a summary grouped by category.
    """
    transactionCategorySummary(
      filter: TransactionSummaryFilterInput
      limit: Int
    ): [TransactionCategorySummary!]!
    """
    Returns a time series of transaction evolution.
    """
    transactionTimeline(
      filter: TransactionSummaryFilterInput
      interval: TransactionTimelineInterval
    ): [TransactionTimelinePoint!]!
  }

  """
  Write operations exposed by the API.
  """
  type Mutation {
    """
    Creates a new user account.
    """
    register(input: RegisterInput!): RegisterPayload!
    """
    Authenticates a user and returns a session token.
    """
    login(input: LoginInput!): AuthPayload!
    """
    Ends the current session by removing the authentication cookie.
    """
    logout: Boolean!
    """
    Updates allowed profile data for the user.
    """
    updateProfile(input: UpdateProfileInput!): User!
    """
    Requests a signed URL for avatar upload.
    """
    requestProfileAvatarUploadUrl(input: ProfileAvatarUploadInput!): UploadPayload!
    """
    Confirms and saves the uploaded avatar.
    """
    updateProfileAvatar(input: UpdateProfileAvatarInput!): User!
    """
    Removes the current profile photo.
    """
    removeProfileAvatar: User!
    """
    Requests an OTP code for password recovery.
    """
    requestPasswordReset(input: RequestPasswordResetInput!): Boolean!
    """
    Validates the OTP and resets the account password.
    """
    resetPassword(input: ResetPasswordInput!): Boolean!
    """
    Creates a new category.
    """
    createCategory(input: CreateCategoryInput!): Category!
    """
    Updates an existing category.
    """
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    """
    Deletes a category by identifier.
    """
    deleteCategory(id: ID!): Boolean!
    """
    Creates a new transaction.
    """
    createTransaction(input: CreateTransactionInput!): Transaction!
    """
    Updates an existing transaction.
    """
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    """
    Deletes a transaction by identifier.
    """
    deleteTransaction(id: ID!): Boolean!
    """
    Requests a signed URL for receipt upload.
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
