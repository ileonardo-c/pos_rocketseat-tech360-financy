import { jsx as _jsx } from "react/jsx-runtime";
import { useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOGIN_MUTATION, ME_QUERY, REGISTER_MUTATION } from "@/lib/graphql/operations";
const AuthContext = createContext(null);
const sessionExpiredEventName = "financy:session-expired";
const sessionExpiredMessage = "Sua sessão expirou. Faça login novamente.";
const resolveHydrationErrorMessage = (error) => {
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = String(error.message).toLowerCase();
        if (message.includes("unauthenticated") || message.includes("not authenticated")) {
            return sessionExpiredMessage;
        }
    }
    return "Não foi possível validar sua sessão agora. Tente novamente em instantes.";
};
const resolveAuthErrorMessage = (error) => {
    if (typeof error === "object" && error !== null && "message" in error) {
        const message = String(error.message).toLowerCase();
        if (message.includes("invalid") || message.includes("credenciais")) {
            return "E-mail ou senha inválidos.";
        }
        if (message.includes("already exists") ||
            message.includes("já existe") ||
            message.includes("duplicate")) {
            return "Este e-mail já está em uso.";
        }
    }
    return "Não foi possível concluir a autenticação. Tente novamente.";
};
export const AuthProvider = ({ children }) => {
    const client = useApolloClient();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState(null);
    const navigate = useNavigate();
    const [signupMutation] = useMutation(REGISTER_MUTATION);
    const [signinMutation] = useMutation(LOGIN_MUTATION);
    const [loadMe] = useLazyQuery(ME_QUERY, {
        fetchPolicy: "network-only",
        onCompleted: (result) => {
            setUser(result.me);
            setAuthError(null);
            setLoading(false);
        },
        onError: (error) => {
            setUser(null);
            setAuthError(resolveHydrationErrorMessage(error));
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
    const clearAuthError = useCallback(() => {
        setAuthError(null);
    }, []);
    const signin = useCallback(async (input) => {
        setLoading(true);
        setAuthError(null);
        try {
            const response = await signinMutation({ variables: { input } });
            const token = response.data.login.token;
            persistAuth(token);
            setUser(response.data.login.user);
            navigate("/");
        }
        catch (error) {
            setAuthError(resolveAuthErrorMessage(error));
        }
        finally {
            setLoading(false);
        }
    }, [signinMutation, persistAuth, navigate]);
    const signup = useCallback(async (input) => {
        setLoading(true);
        setAuthError(null);
        try {
            const response = await signupMutation({ variables: { input } });
            const token = response.data.register.token;
            persistAuth(token);
            setUser(response.data.register.user);
            navigate("/");
        }
        catch (error) {
            setAuthError(resolveAuthErrorMessage(error));
        }
        finally {
            setLoading(false);
        }
    }, [signupMutation, persistAuth, navigate]);
    const signout = useCallback(() => {
        localStorage.removeItem("financy.token");
        setUser(null);
        setAuthError(null);
        client.resetStore();
        navigate("/signup");
    }, [client, navigate]);
    const handleSessionExpired = useCallback(() => {
        localStorage.removeItem("financy.token");
        setUser(null);
        setAuthError(sessionExpiredMessage);
        client.resetStore();
        navigate("/", { replace: true });
    }, [client, navigate]);
    useEffect(() => {
        void hydrate();
    }, [hydrate]);
    useEffect(() => {
        const listener = () => {
            handleSessionExpired();
        };
        window.addEventListener(sessionExpiredEventName, listener);
        return () => {
            window.removeEventListener(sessionExpiredEventName, listener);
        };
    }, [handleSessionExpired]);
    const value = useMemo(() => ({ user, loading, authError, clearAuthError, signin, signup, signout }), [user, loading, authError, clearAuthError, signin, signup, signout]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return value;
};
