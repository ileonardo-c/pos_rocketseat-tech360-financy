import { authMutations } from "./mutations/auth";
import { authQueries } from "./queries/auth";

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

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
  }
`;

export const resolvers = {
  Query: {
    ...authQueries,
  },
  Mutation: {
    ...authMutations,
  },
};
