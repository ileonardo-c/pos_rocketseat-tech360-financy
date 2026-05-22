import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });

  const getEmailError = (value: string) => {
    if (!value.trim()) {
      return "Informe seu e-mail.";
    }
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return isEmailValid ? "" : "Informe um e-mail válido.";
  };

  const getPasswordError = (value: string) => {
    if (!value) {
      return "Informe sua senha.";
    }
    return "";
  };

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
    <main className="min-h-screen grid place-items-center bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-950 px-4 py-8">
      <Card className="w-full max-w-md border-slate-200/80 bg-white/95 px-8 py-10 shadow-panel">
        <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">
          Login
        </h1>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setTouched({ email: true, password: true });

            const submitEmailError = getEmailError(email);
            const submitPasswordError = getPasswordError(password);
            if (submitEmailError || submitPasswordError) {
              return;
            }

            await signin({ email: email.trim(), password });
          }}
        >
          <label className="space-y-1.5 text-sm font-medium text-slate-800" htmlFor="signin-email">
            Email
            <Input
              id="signin-email"
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
            htmlFor="signin-password"
          >
            Senha
            <Input
              id="signin-password"
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
            {passwordError ? (
              <span className="mt-1 text-xs text-red-600">{passwordError}</span>
            ) : null}
          </label>

          <ErrorBanner message={authError} />

          <Button disabled={loading || Boolean(emailError) || Boolean(passwordError)} type="submit">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Não tem conta?{" "}
          <Link className="font-semibold text-indigo-700 hover:text-indigo-900" to="/signup">
            Cadastrar
          </Link>
        </p>
      </Card>
    </main>
  );
};
