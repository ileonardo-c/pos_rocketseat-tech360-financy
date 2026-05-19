import { authMutations } from "./mutations/auth";
import { authQueries } from "./queries/auth";
import { categoryMutations } from "./mutations/category";
import { categoryQueries } from "./queries/category";

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

  type Query {
    me: User
    categories: [Category!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(id: ID!, input: UpdateCategoryInput!): Category!
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
};
