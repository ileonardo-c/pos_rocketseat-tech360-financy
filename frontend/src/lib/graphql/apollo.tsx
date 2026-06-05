import { isAuthenticationGraphQLError } from "@/lib/auth/auth-errors";
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider as ApolloProviderBase,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { useMemo } from "react";

type ApolloProviderProps = {
  children: React.ReactNode;
};

const apiBaseUrl =
  typeof import.meta.env.VITE_BACKEND_URL === "string"
    ? import.meta.env.VITE_BACKEND_URL.trim().replace(/\/$/, "")
    : "";

const graphqlUri = import.meta.env.PROD && apiBaseUrl ? `${apiBaseUrl}/graphql` : "/graphql";
const csrfCookieName = "financy_csrf";
const csrfHeaderName = "X-CSRF-Token";

const apiUnavailableEventName = "financy:api-unavailable";
const apiRecoveredEventName = "financy:api-recovered";

const emitApiUnavailable = () => {
  window.dispatchEvent(new CustomEvent(apiUnavailableEventName));
};

const emitApiRecovered = () => {
  window.dispatchEvent(new CustomEvent(apiRecoveredEventName));
};

const apolloFetch: typeof fetch = async (...args) => {
  try {
    const response = await fetch(...args);
    if (response.ok) {
      emitApiRecovered();
    }
    return response;
  } catch (error) {
    emitApiUnavailable();
    throw error;
  }
};

const httpLink = createHttpLink({
  uri: graphqlUri,
  credentials: "include",
  fetch: apolloFetch,
});

const getCookieValue = (name: string) => {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

const csrfLink = new ApolloLink((operation, forward) => {
  const csrfToken = getCookieValue(csrfCookieName);
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
    },
  }));

  return forward(operation);
});

const PUBLIC_AUTH_OPERATIONS = new Set([
  "Login",
  "Register",
  "RequestPasswordReset",
  "ResetPassword",
  "Logout",
]);

const sessionExpiredEventName = "financy:session-expired";

const emitSessionExpired = () => {
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName));
};

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  const operationName = operation.operationName ?? "";
  const isPublicAuthOperation = PUBLIC_AUTH_OPERATIONS.has(operationName);

  if (graphQLErrors?.some((error) => isAuthenticationGraphQLError(error))) {
    if (isPublicAuthOperation) {
      return;
    }
    emitSessionExpired();
    return;
  }

  const statusCode =
    "statusCode" in (networkError ?? {})
      ? Number((networkError as { statusCode?: number }).statusCode)
      : undefined;
  if (statusCode === 401 && !isPublicAuthOperation) {
    emitSessionExpired();
    return;
  }

  if (networkError) {
    emitApiUnavailable();
  }
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: from([csrfLink, errorLink, httpLink]),
});

export const ApolloProvider = ({ children }: ApolloProviderProps) => {
  const memoizedClient = useMemo(() => client, []);
  return <ApolloProviderBase client={memoizedClient}>{children}</ApolloProviderBase>;
};
