import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main>
      <h1>Login</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await signin({ email, password });
        }}
      >
        <label>
          Email
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button disabled={loading} type="submit">
          Entrar
        </button>
      </form>
      <p>
        Nao tem conta? <Link to="/signup">Cadastrar</Link>
      </p>
    </main>
  );
};
