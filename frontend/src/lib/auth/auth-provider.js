import { jsx as _jsx } from "react/jsx-runtime";
import { useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOGIN_MUTATION, ME_QUERY, REGISTER_MUTATION } from "@/lib/graphql/operations";
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const client = useApolloClient();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [signupMutation] = useMutation(REGISTER_MUTATION);
    const [signinMutation] = useMutation(LOGIN_MUTATION);
    const [loadMe] = useLazyQuery(ME_QUERY, {
        fetchPolicy: "network-only",
        onCompleted: (result) => {
            setUser(result.me);
            setLoading(false);
        },
        onError: () => {
            setUser(null);
            setLoading(false);
        },
    });
    const hydrate = useCallback(() => {
        const token = localStorage.getItem("financy.token");
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        loadMe().finally(() => setLoading(false));
    }, [loadMe]);
    const persistAuth = useCallback((token) => {
        localStorage.setItem("financy.token", token);
        client.resetStore();
        hydrate();
    }, [client, hydrate]);
    const signin = useCallback(async (input) => {
        setLoading(true);
        try {
            const response = await signinMutation({ variables: { input } });
            const token = response.data.login.token;
            persistAuth(token);
            setUser(response.data.login.user);
            navigate("/");
        }
        finally {
            setLoading(false);
        }
    }, [signinMutation, persistAuth, navigate]);
    const signup = useCallback(async (input) => {
        setLoading(true);
        try {
            const response = await signupMutation({ variables: { input } });
            const token = response.data.register.token;
            persistAuth(token);
            setUser(response.data.register.user);
            navigate("/");
        }
        finally {
            setLoading(false);
        }
    }, [signupMutation, persistAuth, navigate]);
    const signout = useCallback(() => {
        localStorage.removeItem("financy.token");
        setUser(null);
        client.resetStore();
        navigate("/signup");
    }, [client, navigate]);
    useEffect(() => {
        void hydrate();
    }, [hydrate]);
    const value = useMemo(() => ({ user, loading, signin, signup, signout }), [user, loading, signin, signup, signout]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return value;
};
