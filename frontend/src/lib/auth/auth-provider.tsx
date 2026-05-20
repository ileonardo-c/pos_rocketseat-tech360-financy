import { useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LOGIN_MUTATION, ME_QUERY, REGISTER_MUTATION } from "@/lib/graphql/operations";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextData = {
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
  signin: (input: { email: string; password: string }) => Promise<void>;
  signout: () => void;
};

const AuthContext = createContext<AuthContextData | null>(null);
const sessionExpiredEventName = "financy:session-expired";
const sessionExpiredMessage = "Sua sessão expirou. Faça login novamente.";
const resolveHydrationErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message).toLowerCase();
    if (message.includes("unauthenticated") || message.includes("not authenticated")) {
      return sessionExpiredMessage;
    }
  }

  return "Não foi possível validar sua sessão agora. Tente novamente em instantes.";
};

const resolveAuthErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String(error.message).toLowerCase();
    if (message.includes("invalid")) {
      return "E-mail ou senha inválidos.";
    }
    if (
      message.includes("already exists") ||
      message.includes("already registered") ||
      message.includes("conflict") ||
      message.includes("duplicate")
    ) {
      return "Este e-mail já está em uso.";
    }
  }

  return "Não foi possível concluir a autenticação. Tente novamente.";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useApolloClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  const persistAuth = useCallback(
    (token: string) => {
      localStorage.setItem("financy.token", token);
      client.resetStore();
      hydrate();
    },
    [client, hydrate],
  );

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signin = useCallback(
    async (input: { email: string; password: string }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await signinMutation({ variables: { input } });
        const token = response.data.login.token;
        persistAuth(token);
        setUser(response.data.login.user);
        navigate("/");
      } catch (error) {
        setAuthError(resolveAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [signinMutation, persistAuth, navigate],
  );

  const signup = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await signupMutation({ variables: { input } });
        const token = response.data.register.token;
        persistAuth(token);
        setUser(response.data.register.user);
        navigate("/");
      } catch (error) {
        setAuthError(resolveAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [signupMutation, persistAuth, navigate],
  );

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

  const value = useMemo<AuthContextData>(
    () => ({ user, loading, authError, clearAuthError, signin, signup, signout }),
    [user, loading, authError, clearAuthError, signin, signup, signout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
};
