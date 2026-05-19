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
  }

  type AuthPayload {
    token: String!
    user: User!
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
    type: String!
    date: String!
    userId: ID!
    categoryId: ID!
    category: Category
    createdAt: String!
    updatedAt: String!
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
    type: String!
    date: String!
    categoryId: String!
  }

  input UpdateTransactionInput {
    title: String
    description: String
    amount: Float
    type: String
    date: String
    categoryId: String
  }

  input UploadInput {
    fileName: String!
    contentType: String!
  }

  type UploadPayload {
    url: String!
    key: String!
    publicUrl: String!
    expiresIn: Int!
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
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
    deleteCategory(id: ID!): Boolean!
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
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
    ...storageMutations,
  },
  Transaction: {
    date: ({ date }: Transaction) => date.toISOString(),
    createdAt: ({ createdAt }: Transaction) => createdAt.toISOString(),
    updatedAt: ({ updatedAt }: Transaction) => updatedAt.toISOString(),
  },
};
