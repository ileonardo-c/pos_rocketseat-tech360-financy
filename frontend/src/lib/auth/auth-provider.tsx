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

import {
  AUTH_FALLBACK_MESSAGES,
  isAuthenticationGraphQLError,
  resolveAuthErrorMessage,
} from "@/lib/auth/auth-errors";
import {
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  REGISTER_MUTATION,
} from "@/lib/graphql/operations";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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
  const isHandlingSessionExpiredRef = useRef(false);
  const navigate = useNavigate();

  const [signupMutation] = useMutation(REGISTER_MUTATION);
  const [signinMutation] = useMutation(LOGIN_MUTATION);
  const [signoutMutation] = useMutation(LOGOUT_MUTATION);
  const [loadMe] = useLazyQuery(ME_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      setUser(result.me);
      setAuthError(null);
      setLoading(false);
    },
    onError: (error) => {
      setUser(null);
      if (isAuthenticationGraphQLError(error)) {
        setAuthError(null);
      } else {
        setAuthError(resolveAuthErrorMessage(error, AUTH_FALLBACK_MESSAGES.defaultSession));
      }
      setLoading(false);
    },
  });

  const hydrate = useCallback(() => {
    setLoading(true);
    void loadMe();
  }, [loadMe]);

  const clearAuthState = useCallback(
    async (message?: string | null, options?: { clearStore?: boolean }) => {
      setUser(null);
      setAuthError(message ?? null);
      setLoading(false);
      if (options?.clearStore === false) {
        return;
      }
      try {
        await client.clearStore();
      } catch (error) {
        console.warn("Failed to clear Apollo store during auth state cleanup", error);
      }
    },
    [client],
  );

  const clearSession = useCallback(async () => {
    await client.resetStore();
    await hydrate();
  }, [client, hydrate]);

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
        const response = await signinMutation({
          variables: {
            input: {
              email,
              password,
              rememberMe,
            },
          },
        });
        await clearSession();
        setUser(response.data.login.user);
        navigate("/");
        return true;
      } catch (error) {
        setAuthError(normalizeAuthError(error, AUTH_FALLBACK_MESSAGES.defaultAuth));
        return false;
      }
    },
    [clearSession, navigate, signinMutation],
  );

  const signup = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      setAuthError(null);
      try {
        await signupMutation({ variables: { input: { name, email, password } } });
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
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    isHandlingSessionExpiredRef.current = true;
    const performSignout = async () => {
      try {
        await signoutMutation();
      } catch (error) {
        console.warn("Failed to logout on server", error);
      } finally {
        await clearAuthState(null, { clearStore: true });
        if (window.location.pathname !== "/login") {
          navigate("/login", { replace: true });
        }
        isSigningOutRef.current = false;
        isHandlingSessionExpiredRef.current = false;
      }
    };

    void performSignout();
  }, [clearAuthState, navigate, signoutMutation]);

  const handleSessionExpired = useCallback(async () => {
    if (isSigningOutRef.current || isHandlingSessionExpiredRef.current) {
      return;
    }

    isHandlingSessionExpiredRef.current = true;
    try {
      await clearAuthState(AUTH_FALLBACK_MESSAGES.defaultSession, { clearStore: false });
      if (window.location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    } finally {
      isHandlingSessionExpiredRef.current = false;
    }
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
