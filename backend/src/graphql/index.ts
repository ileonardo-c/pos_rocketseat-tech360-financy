import { authMutations } from "./mutations/auth";
import { categoryMutations } from "./mutations/category";
import { transactionMutations } from "./mutations/transaction";
import { uploadMutations } from "./mutations/upload";
import { authQueries } from "./queries/auth";
import { categoryQueries } from "./queries/category";
import { transactionQueries } from "./queries/transaction";

export const typeDefs = `
  enum TransactionType {
    INCOME
    EXPENSE
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Category {
    id: ID!
    name: String!
    userId: ID!
  }

  type Transaction {
    id: ID!
    title: String!
    description: String
    amount: Float!
    type: TransactionType!
    categoryId: ID!
    category: Category
    userId: ID!
    date: String
  }

  type UploadPayload {
    url: String!
    key: String!
    publicUrl: String!
    expiresIn: Int!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateCategoryInput {
    name: String!
  }

  input UpdateCategoryInput {
    name: String
  }

  input CreateTransactionInput {
    title: String!
    description: String
    amount: Float!
    type: TransactionType!
    categoryId: ID!
    date: String
  }

  input UpdateTransactionInput {
    title: String
    description: String
    amount: Float
    type: TransactionType
    categoryId: ID
    date: String
  }

  input UploadInput {
    filename: String!
    contentType: String!
  }

  type Query {
    me: User
    categories: [Category!]!
    transactions: [Transaction!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category
    deleteCategory(id: ID!): Boolean!
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction
    deleteTransaction(id: ID!): Boolean!
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
    ...uploadMutations,
  },
  Transaction: {
    date: (transaction: any) => transaction.date?.toISOString() ?? null,
  },
};
