import { type ApolloError, useApolloClient, useLazyQuery, useMutation } from "@apollo/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  signin: (input: { email: string; password: string; rememberMe?: boolean }) => Promise<boolean>;
  signup: (input: { name: string; email: string; password: string }) => Promise<boolean>;
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
  const isSigningOutRef = useRef(false);
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
      const token = readStoredToken();
      setUser(null);
      if (!token) {
        setAuthError(null);
        setLoading(false);
        return;
      }
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
    }): Promise<boolean> => {
      setAuthError(null);
      try {
        const response = await signinMutation({ variables: { input: { email, password } } });
        await persistAuth(response.data.login.token, rememberMe);
        setUser(response.data.login.user);
        navigate("/");
        return true;
      } catch (error) {
        setAuthError(normalizeAuthError(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
        return false;
      }
    },
    [signinMutation, persistAuth, navigate],
  );

  const signup = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      setAuthError(null);
      try {
        await signupMutation({ variables: { input: { name, email, password } } });
        clearAuthToken();
        setUser(null);
        setAuthError(null);
        try {
          await client.resetStore();
        } catch (error) {
          console.warn("Failed to reset Apollo store after signup", error);
        }
        navigate("/login?registered=1");
        return true;
      } catch (error) {
        setAuthError(normalizeAuthError(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
        return false;
      }
    },
    [client, navigate, signupMutation],
  );

  const signout = useCallback(() => {
    isSigningOutRef.current = true;
    void clearAuthState().then(() => {
      navigate("/login", { replace: true });
      isSigningOutRef.current = false;
    });
  }, [clearAuthState, navigate]);

  const handleSessionExpired = useCallback(async () => {
    if (isSigningOutRef.current) {
      return;
    }
    const token = readStoredToken();
    if (!token) {
      await clearAuthState(null);
      return;
    }
    await clearAuthState(AUTH_FALLBACK_MESSAGES.defaultSession);
    navigate("/login", { replace: true });
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
