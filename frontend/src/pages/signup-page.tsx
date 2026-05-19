import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const SignupPage = () => {
  const { user, signup, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main>
      <h1>Criar conta</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await signup({ name, email, password });
        }}
      >
        <label>
          Nome
          <input
            required
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
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
            autoComplete="new-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button disabled={loading} type="submit">
          Cadastrar
        </button>
      </form>
      <p>
        Já possui conta? <Link to="/">Entrar</Link>
      </p>
    </main>
  );
};
