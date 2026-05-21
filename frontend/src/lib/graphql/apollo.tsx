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

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"}/graphql`,
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("financy.token");
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

const hasUnauthenticatedGraphQLError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unauthenticated") ||
    normalized.includes("not authenticated") ||
    normalized.includes("não autenticado")
  );
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors?.some((error) => hasUnauthenticatedGraphQLError(error.message))) {
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
