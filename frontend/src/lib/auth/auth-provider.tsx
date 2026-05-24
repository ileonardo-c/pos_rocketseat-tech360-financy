import { type ApolloError, useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AUTH_FALLBACK_MESSAGES, resolveAuthErrorMessage } from "@/lib/auth/auth-errors";
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
  updateSessionUser: (user: User | null) => void;
  signin: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
  signout: () => void;
};

const AuthContext = createContext<AuthContextData | null>(null);
const sessionExpiredEventName = "financy:session-expired";
const AUTH_TOKEN_STORAGE_KEY = "financy.token";

const readStoredToken = () =>
  localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

const writeAuthToken = (token: string, keepSignedIn = false) => {
  if (keepSignedIn) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const isApolloError = (error: unknown): error is ApolloError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "graphQLErrors" in error &&
    "networkError" in error
  );
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
        current === AUTH_FALLBACK_MESSAGES.defaultSession
          ? AUTH_FALLBACK_MESSAGES.defaultSession
          : hydrationMessage,
      );
      setLoading(false);
    },
  });

  const hydrate = useCallback(() => {
    const token = readStoredToken();
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
      clearAuthToken();
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
    async (token: string, keepSignedIn = false) => {
      writeAuthToken(token, keepSignedIn);
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

  const updateSessionUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
  }, []);

  const normalizeAuthError = (error: unknown, fallback: string) => {
    if (isApolloError(error)) {
      return resolveAuthErrorMessage(error, fallback);
    }
    return resolveAuthErrorMessage(error, fallback);
  };

  const signin = useCallback(
    async ({
      email,
      password,
      rememberMe,
    }: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await signinMutation({ variables: { input: { email, password } } });
        await persistAuth(response.data.login.token, rememberMe);
        setUser(response.data.login.user);
        navigate("/");
      } catch (error) {
        setAuthError(normalizeAuthError(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
      } finally {
        setLoading(false);
      }
    },
    [signinMutation, persistAuth, navigate],
  );

  const signup = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await signupMutation({ variables: { input: { name, email, password } } });
        await persistAuth(response.data.register.token, true);
        setUser(response.data.register.user);
        navigate("/");
      } catch (error) {
        setAuthError(normalizeAuthError(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
      } finally {
        setLoading(false);
      }
    },
    [signupMutation, persistAuth, navigate],
  );

  const signout = useCallback(() => {
    void clearAuthState().then(() => {
      navigate("/", { replace: true });
    });
  }, [clearAuthState, navigate]);

  const handleSessionExpired = useCallback(async () => {
    await clearAuthState(AUTH_FALLBACK_MESSAGES.defaultSession);
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
    () => ({
      user,
      loading,
      authError,
      clearAuthError,
      updateSessionUser,
      signin,
      signup,
      signout,
    }),
    [clearAuthError, loading, signin, signup, signout, updateSessionUser, user, authError],
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
