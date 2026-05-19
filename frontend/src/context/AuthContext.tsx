import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useApolloClient } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { LOGIN_MUTATION, REGISTER_MUTATION } from "../lib/graphql/mutations";
import { ME_QUERY } from "../lib/graphql/queries";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("financy-token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const client = useApolloClient();
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [registerMutation] = useMutation(REGISTER_MUTATION);
  const navigate = useNavigate();

  useEffect(() => {
    const bootstrap = async () => {
      const existingToken = localStorage.getItem("financy-token");
      if (!existingToken) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await client.query({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        });

        setUser(data.me);
      } catch {
        localStorage.removeItem("financy-token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap().catch(() => setLoading(false));
  }, [client]);

  const login = async (email: string, password: string) => {
    const response = await loginMutation({ variables: { input: { email, password } } });
    const auth = response.data?.login;
    if (!auth?.token) {
      throw new Error("Falha no login");
    }

    localStorage.setItem("financy-token", auth.token);
    setToken(auth.token);
    setUser(auth.user);
    navigate("/");
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await registerMutation({
      variables: { input: { name, email, password } },
    });
    const auth = response.data?.register;
    if (!auth?.token) {
      throw new Error("Falha no cadastro");
    }

    localStorage.setItem("financy-token", auth.token);
    setToken(auth.token);
    setUser(auth.user);
    navigate("/");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("financy-token");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
