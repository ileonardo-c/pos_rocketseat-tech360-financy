import { authMutations } from "./mutations/auth";
import { categoryMutations } from "./mutations/category";
import { authQueries } from "./queries/auth";
import { categoryQueries } from "./queries/category";

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
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category
    deleteCategory(id: ID!): Boolean!
  }
`;

export const resolvers = {
  Query: {
    ...authQueries,
    ...categoryQueries,
  },
  Mutation: {
    ...authMutations,
    ...categoryMutations,
  },
  Transaction: {
    date: (transaction: any) => transaction.date?.toISOString() ?? null,
  },
};
