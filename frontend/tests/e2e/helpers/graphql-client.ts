import type { APIRequestContext } from "@playwright/test";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;

type GraphQLResponse<T = Record<string, unknown>> = {
  data: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

export async function graphqlRequest<T = Record<string, unknown>>(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await request.post(API_URL, {
    headers,
    data: { query, variables },
  });

  return response.json();
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const result = await graphqlRequest<{ login: { token: string } }>(
    request,
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user { id name email }
      }
    }`,
    { input: { email, password } },
  );

  if (result.errors?.length || !result.data?.login?.token) {
    throw new Error(`Login via API failed: ${result.errors?.[0]?.message ?? "no token returned"}`);
  }

  return result.data.login.token;
}

export async function meQuery(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; name: string; email: string }> {
  const result = await graphqlRequest<{ me: { id: string; name: string; email: string } }>(
    request,
    "query Me { me { id name email } }",
    {},
    token,
  );

  if (result.errors?.length || !result.data?.me) {
    throw new Error(`Me query failed: ${result.errors?.[0]?.message ?? "no data"}`);
  }

  return result.data.me;
}

export async function listCategories(
  request: APIRequestContext,
  token: string,
): Promise<Array<{ id: string; name: string; description: string }>> {
  const result = await graphqlRequest<{
    categories: Array<{ id: string; name: string; description: string }>;
  }>(request, "query Categories { categories { id name description } }", {}, token);

  if (result.errors?.length) {
    throw new Error(`List categories failed: ${result.errors[0]?.message}`);
  }

  return result.data?.categories ?? [];
}

export async function listTransactions(
  request: APIRequestContext,
  token: string,
  filter?: { from?: string; to?: string },
): Promise<Array<{ id: string; title: string; amount: number }>> {
  const result = await graphqlRequest<{
    transactions: Array<{ id: string; title: string; amount: number }>;
  }>(
    request,
    `query Transactions($filter: TransactionListFilterInput) {
      transactions(filter: $filter) { id title amount }
    }`,
    { filter: filter ?? {} },
    token,
  );

  if (result.errors?.length) {
    throw new Error(`List transactions failed: ${result.errors[0]?.message}`);
  }

  return result.data?.transactions ?? [];
}
