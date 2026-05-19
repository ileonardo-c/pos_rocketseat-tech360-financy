import { authMutations } from "./mutations/auth";
import { authQueries } from "./queries/auth";
import { categoryMutations } from "./mutations/category";
import { categoryQueries } from "./queries/category";
import { transactionMutations } from "./mutations/transaction";
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
  },
  Transaction: {
    date: ({ date }) => date.toISOString(),
    createdAt: ({ createdAt }) => createdAt.toISOString(),
    updatedAt: ({ updatedAt }) => updatedAt.toISOString(),
  },
};
