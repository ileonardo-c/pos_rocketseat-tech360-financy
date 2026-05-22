import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
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
    <main className="auth-layout min-h-screen grid place-items-center bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-950 px-4 py-8">
      <Card className="w-full max-w-md border-slate-200/80 bg-white/95 px-8 py-10 shadow-panel">
        <h1 className="mb-6 text-center text-3xl font-semibold text-slate-900">Criar conta</h1>
        <form
          className="flex flex-col gap-4"
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
          <label className="space-y-1.5 text-sm font-medium text-slate-800" htmlFor="signup-name">
            Nome
            <Input
              id="signup-name"
              required
              type="text"
              value={name}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              onChange={(event) => {
                clearAuthError();
                setName(event.target.value);
              }}
            />
            {nameError ? <span className="mt-1 text-xs text-red-600">{nameError}</span> : null}
          </label>
          <label className="space-y-1.5 text-sm font-medium text-slate-800" htmlFor="signup-email">
            Email
            <Input
              id="signup-email"
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
            {emailError ? <span className="mt-1 text-xs text-red-600">{emailError}</span> : null}
          </label>
          <label
            className="space-y-1.5 text-sm font-medium text-slate-800"
            htmlFor="signup-password"
          >
            Senha
            <Input
              id="signup-password"
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
            {passwordError ? (
              <span className="mt-1 text-xs text-red-600">{passwordError}</span>
            ) : null}
          </label>

          <ErrorBanner message={authError} />

          <Button
            disabled={
              loading || Boolean(nameError) || Boolean(emailError) || Boolean(passwordError)
            }
            type="submit"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Já possui conta?{" "}
          <Link className="font-semibold text-indigo-700 hover:text-indigo-900" to="/">
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  );
};
