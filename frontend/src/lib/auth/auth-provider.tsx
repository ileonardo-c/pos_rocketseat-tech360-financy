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

type AuthErrorRule = {
  messages: string[];
  toUserMessage: string;
};

const AuthContext = createContext<AuthContextData | null>(null);
const sessionExpiredEventName = "financy:session-expired";
const sessionExpiredMessage = "Sua sessão expirou. Faça login novamente.";

const AUTH_ERROR_RULES: AuthErrorRule[] = [
  {
    messages: [
      "unauthenticated",
      "not authenticated",
      "session expired",
      "expired token",
      "não autenticado",
    ],
    toUserMessage: sessionExpiredMessage,
  },
  {
    messages: ["invalid name"],
    toUserMessage: "Por favor, informe um nome válido.",
  },
  {
    messages: ["invalid email"],
    toUserMessage: "Por favor, informe um e-mail válido.",
  },
  {
    messages: ["invalid password"],
    toUserMessage: "A senha deve ter pelo menos 6 caracteres.",
  },
  {
    messages: ["invalid credentials"],
    toUserMessage: "E-mail ou senha inválidos.",
  },
  {
    messages: ["already exists", "already registered", "conflict", "duplicate", "já cadastrado"],
    toUserMessage: "Este e-mail já está em uso.",
  },
];

const AUTH_FALLBACK_MESSAGES = {
  defaultSession: "Não foi possível validar sua sessão agora. Tente novamente em instantes.",
  defaultAuth: "Não foi possível concluir a autenticação. Tente novamente.",
};

const normalizeErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message).toLowerCase();
  }
  return "";
};

const resolveAuthErrorMessage = (error: unknown, fallback: string) => {
  const message = normalizeErrorMessage(error);
  const foundRule = AUTH_ERROR_RULES.find((rule) =>
    rule.messages.some((value) => message.includes(value)),
  );
  if (!foundRule) {
    return fallback;
  }
  return foundRule.toUserMessage;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const client = useApolloClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      const hydrationMessage = resolveAuthErrorMessage(
        error,
        AUTH_FALLBACK_MESSAGES.defaultSession,
      );
      setAuthError((current) =>
        current === sessionExpiredMessage ? sessionExpiredMessage : hydrationMessage,
      );
      setLoading(false);
    },
  });

  const hydrate = useCallback(() => {
    const token = localStorage.getItem("financy.token");
    if (!token) {
      setUser(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadMe();
  }, [loadMe]);

  const clearAuthState = useCallback(
    async (message?: string | null) => {
      localStorage.removeItem("financy.token");
      setUser(null);
      setAuthError(message ?? null);
      setLoading(false);
      try {
        await client.resetStore();
      } catch (error) {
        console.warn("Failed to reset Apollo store during auth state cleanup", error);
      }
    },
    [client],
  );

  const persistAuth = useCallback(
    async (token: string) => {
      localStorage.setItem("financy.token", token);
      try {
        await client.resetStore();
      } catch (error) {
        console.warn("Failed to reset Apollo store after auth persistence", error);
      }
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
        await persistAuth(response.data.login.token);
        setUser(response.data.login.user);
        navigate("/");
      } catch (error) {
        setAuthError(resolveAuthErrorMessage(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
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
        await persistAuth(response.data.register.token);
        setUser(response.data.register.user);
        navigate("/");
      } catch (error) {
        setAuthError(resolveAuthErrorMessage(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
      } finally {
        setLoading(false);
      }
    },
    [signupMutation, persistAuth, navigate],
  );

  const signout = useCallback(() => {
    void clearAuthState().then(() => {
      navigate("/signup", { replace: true });
    });
  }, [clearAuthState, navigate]);

  const handleSessionExpired = useCallback(async () => {
    await clearAuthState(sessionExpiredMessage);
    navigate("/", { replace: true });
  }, [clearAuthState, navigate]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const listener = () => {
      void handleSessionExpired();
    };
    window.addEventListener(sessionExpiredEventName, listener);
    return () => {
      window.removeEventListener(sessionExpiredEventName, listener);
    };
  }, [handleSessionExpired]);

  const value = useMemo<AuthContextData>(
    () => ({ user, loading, authError, clearAuthError, signin, signup, signout }),
    [clearAuthError, loading, signin, signup, signout, user, authError],
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
