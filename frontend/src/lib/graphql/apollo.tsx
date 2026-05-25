import { isAuthenticationGraphQLError } from "@/lib/auth/auth-errors";
import {
  ApolloClient,
  ApolloProvider as ApolloProviderBase,
  InMemoryCache,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
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

const httpLink = createHttpLink({
  uri: graphqlUri,
});

const AUTH_TOKEN_STORAGE_KEY = "financy.token";

const getStoredToken = () => {
  return (
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );
};

const authLink = setContext((_, { headers }) => {
  const token = getStoredToken();
  if (!token) {
    return { headers };
  }

  return {
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
    },
  };
});

const sessionExpiredEventName = "financy:session-expired";

const emitSessionExpired = () => {
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName));
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors?.some((error) => isAuthenticationGraphQLError(error))) {
    emitSessionExpired();
    return;
  }

  const statusCode =
    "statusCode" in (networkError ?? {})
      ? Number((networkError as { statusCode?: number }).statusCode)
      : undefined;
  if (statusCode === 401) {
    emitSessionExpired();
  }
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: errorLink.concat(authLink).concat(httpLink),
});

export const ApolloProvider = ({ children }: ApolloProviderProps) => {
  const memoizedClient = useMemo(() => client, []);
  return <ApolloProviderBase client={memoizedClient}>{children}</ApolloProviderBase>;
};
