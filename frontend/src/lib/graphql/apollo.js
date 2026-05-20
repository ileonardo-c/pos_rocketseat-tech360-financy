import { jsx as _jsx } from "react/jsx-runtime";
import { ApolloClient, ApolloProvider as ApolloProviderBase, InMemoryCache, createHttpLink, } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { useMemo } from "react";
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
const hasUnauthenticatedGraphQLError = (message) => {
    const normalized = message.toLowerCase();
    return normalized.includes("unauthenticated") || normalized.includes("not authenticated");
};
const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors?.some((error) => hasUnauthenticatedGraphQLError(error.message))) {
        emitSessionExpired();
        return;
    }
    const statusCode = "statusCode" in (networkError ?? {})
        ? Number(networkError.statusCode)
        : undefined;
    if (statusCode === 401) {
        emitSessionExpired();
    }
});
const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: errorLink.concat(authLink).concat(httpLink),
});
export const ApolloProvider = ({ children }) => {
    const memoizedClient = useMemo(() => client, []);
    return _jsx(ApolloProviderBase, { client: memoizedClient, children: children });
};
