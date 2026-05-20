import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const SignupPage = () => {
  const { user, signup, loading, authError, clearAuthError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const nameError = useMemo(() => {
    if (!touched.name) {
      return "";
    }
    return name.trim().length >= 2 ? "" : "Informe seu nome com pelo menos 2 caracteres.";
  }, [name, touched.name]);

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
    return password.length >= 6 ? "" : "A senha deve ter pelo menos 6 caracteres.";
  }, [password, touched.password]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-layout">
      <h1>Criar conta</h1>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setTouched({ name: true, email: true, password: true });

          if (nameError || emailError || passwordError) {
            return;
          }

          await signup({ name: name.trim(), email: email.trim(), password });
        }}
      >
        <label>
          Nome
          <input
            required
            type="text"
            value={name}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            onChange={(event) => {
              clearAuthError();
              setName(event.target.value);
            }}
          />
          {nameError ? <span className="form-error">{nameError}</span> : null}
        </label>
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
            autoComplete="new-password"
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

        <button
          disabled={loading || Boolean(nameError) || Boolean(emailError) || Boolean(passwordError)}
          type="submit"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
      <p>
        Já possui conta? <Link to="/">Entrar</Link>
      </p>
    </main>
  );
};