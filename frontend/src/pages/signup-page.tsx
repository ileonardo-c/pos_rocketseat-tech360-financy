import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-provider";

export const SignupPage = () => {
  const { user, signup, loading, authError, clearAuthError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  const getNameError = (value: string) =>
    value.trim().length >= 2 ? "" : "Informe seu nome com pelo menos 2 caracteres.";
  const getEmailError = (value: string) => {
    if (!value.trim()) {
      return "Informe seu e-mail.";
    }
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return isEmailValid ? "" : "Informe um e-mail válido.";
  };
  const getPasswordError = (value: string) =>
    value.length >= 6 ? "" : "A senha deve ter pelo menos 6 caracteres.";

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const nameError = useMemo(() => {
    if (!touched.name) {
      return "";
    }
    return getNameError(name);
  }, [name, touched.name]);

  const emailError = useMemo(() => {
    if (!touched.email) {
      return "";
    }
    return getEmailError(email);
  }, [email, touched.email]);

  const passwordError = useMemo(() => {
    if (!touched.password) {
      return "";
    }
    return getPasswordError(password);
  }, [password, touched.password]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <h1 className="auth-title">Criar conta</h1>
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setTouched({ name: true, email: true, password: true });

          const submitNameError = getNameError(name);
          const submitEmailError = getEmailError(email);
          const submitPasswordError = getPasswordError(password);
          if (submitNameError || submitEmailError || submitPasswordError) {
            return;
          }

          await signup({ name: name.trim(), email: email.trim(), password });
        }}
      >
        <label>
          Nome
          <input
            className="auth-input"
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
            className="auth-input"
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
            className="auth-input"
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
          className="auth-submit"
          disabled={loading || Boolean(nameError) || Boolean(emailError) || Boolean(passwordError)}
          type="submit"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
      <p className="auth-footer">
        Já possui conta? <Link to="/">Entrar</Link>
      </p>
      </section>
    </main>
  );
};
