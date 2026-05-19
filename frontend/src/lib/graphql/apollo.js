import { jsx as _jsx } from "react/jsx-runtime";
import { ApolloClient, ApolloProvider as ApolloProviderBase, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
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
const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
});
export const ApolloProvider = ({ children }) => {
    const memoizedClient = useMemo(() => client, []);
    return _jsx(ApolloProviderBase, { client: memoizedClient, children: children });
};
