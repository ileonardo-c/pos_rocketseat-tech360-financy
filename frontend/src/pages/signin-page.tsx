import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const emailError = useMemo(() => {
    if (!touched.email) {
      return "";
    }
    if (!email.trim()) {
      return "Informe seu e-mail.";
    }
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return isEmailValid ? "" : "Informe um e-mail válido.";
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) {
      return "";
    }
    if (!password) {
      return "Informe sua senha.";
    }
    return "";
  }, [password, touched.password]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-layout">
      <h1>Login</h1>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setTouched({ email: true, password: true });

          if (emailError || passwordError) {
            return;
          }

          await signin({ email: email.trim(), password });
        }}
      >
        <label>
          Email
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            onChange={(event) => {
              clearAuthError();
              setEmail(event.target.value);
            }}
          />
          {emailError ? <span className="form-error">{emailError}</span> : null}
        </label>
        <label>
          Senha
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
            onChange={(event) => {
              clearAuthError();
              setPassword(event.target.value);
            }}
          />
          {passwordError ? <span className="form-error">{passwordError}</span> : null}
        </label>

        {authError ? <p className="form-error">{authError}</p> : null}

        <button disabled={loading || Boolean(emailError) || Boolean(passwordError)} type="submit">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p>
        Não tem conta? <Link to="/signup">Cadastrar</Link>
      </p>
    </main>
  );
};