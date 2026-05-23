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
  const [shakeName, setShakeName] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [shakeNonce, setShakeNonce] = useState({ name: 0, email: 0, password: 0 });

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

  useEffect(() => {
    if (!nameError) {
      setShakeName(false);
      return;
    }
    setShakeName(true);
    const timeout = window.setTimeout(() => setShakeName(false), 320);
    return () => window.clearTimeout(timeout);
  }, [nameError, shakeNonce.name]);

  useEffect(() => {
    if (!emailError) {
      setShakeEmail(false);
      return;
    }
    setShakeEmail(true);
    const timeout = window.setTimeout(() => setShakeEmail(false), 320);
    return () => window.clearTimeout(timeout);
  }, [emailError, shakeNonce.email]);

  useEffect(() => {
    if (!passwordError) {
      setShakePassword(false);
      return;
    }
    setShakePassword(true);
    const timeout = window.setTimeout(() => setShakePassword(false), 320);
    return () => window.clearTimeout(timeout);
  }, [passwordError, shakeNonce.password]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="auth-layout min-h-screen bg-[#f3f4f6] px-4 py-8 text-slate-700 sm:py-12">
      <div className="mx-auto w-full max-w-[448px]">
        <header className="mb-6 flex items-center justify-center gap-3 text-[#24784A] sm:mb-8">
          <svg
            aria-hidden="true"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="7" r="5" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="16" cy="17" r="5" stroke="currentColor" strokeWidth="2.5" />
            <path d="M11 10L13 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
          <span className="text-3xl font-black uppercase tracking-[0.1em] sm:text-4xl">
            Financy
          </span>
        </header>

        <Card className="border border-slate-300/85 bg-white px-5 py-6 shadow-none transition-all duration-300 ease-out sm:px-8 sm:py-9">
          <h1 className="text-center text-3xl font-bold leading-[1.15] text-slate-900 sm:text-[40px]">
            Criar conta
          </h1>
          <p className="mt-2 text-center text-base leading-[1.35] text-slate-600 sm:mt-3 sm:text-[34px] sm:leading-[1.15]">
            Registre-se para começar a usar o Financy
          </p>
          <form
            className="mt-7 flex flex-col gap-4 sm:mt-9 sm:gap-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setTouched({ name: true, email: true, password: true });

              const submitNameError = getNameError(name);
              const submitEmailError = getEmailError(email);
              const submitPasswordError = getPasswordError(password);
              if (submitNameError || submitEmailError || submitPasswordError) {
                setShakeNonce((prev) => ({
                  name: submitNameError ? prev.name + 1 : prev.name,
                  email: submitEmailError ? prev.email + 1 : prev.email,
                  password: submitPasswordError ? prev.password + 1 : prev.password,
                }));
                return;
              }

              await signup({ name: name.trim(), email: email.trim(), password });
            }}
          >
            <label
              className="space-y-2 text-base font-semibold text-slate-700 sm:text-xl"
              htmlFor="signup-name"
            >
              Nome
              <div className={`t-input-wrap relative ${nameError ? "is-error" : ""}`}>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 13a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 13zm0 0c-3.3 0-6 2.01-6 4.5V19h12v-1.5c0-2.49-2.7-4.5-6-4.5z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                <Input
                  id="signup-name"
                  autoComplete="name"
                  className={`t-input h-12 rounded-xl border-slate-300 bg-white pl-12 text-base text-slate-500 placeholder:text-slate-400 focus:border-[#24784A] focus:ring-[#24784A]/15 sm:h-14 sm:text-2xl ${shakeName ? "is-shaking" : ""}`}
                  placeholder="Seu nome completo"
                  required
                  type="text"
                  value={name}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  onChange={(event) => {
                    clearAuthError();
                    setName(event.target.value);
                  }}
                />
              </div>
              {nameError ? (
                <span className="t-error-msg mt-1 block text-sm text-red-600 sm:text-base">
                  {nameError}
                </span>
              ) : null}
            </label>
            <label
              className="space-y-2 text-base font-semibold text-slate-700 sm:text-xl"
              htmlFor="signup-email"
            >
              Email
              <div className={`t-input-wrap relative ${emailError ? "is-error" : ""}`}>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 7.5C4 6.67 4.67 6 5.5 6h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="m5 8 7 5 7-5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                <Input
                  id="signup-email"
                  autoComplete="email"
                  className={`t-input h-12 rounded-xl border-slate-300 bg-white pl-12 text-base text-slate-500 placeholder:text-slate-400 focus:border-[#24784A] focus:ring-[#24784A]/15 sm:h-14 sm:text-2xl ${shakeEmail ? "is-shaking" : ""}`}
                  placeholder="mail@exemplo.com"
                  required
                  type="email"
                  value={email}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  onChange={(event) => {
                    clearAuthError();
                    setEmail(event.target.value);
                  }}
                />
              </div>
              {emailError ? (
                <span className="t-error-msg mt-1 block text-sm text-red-600 sm:text-base">
                  {emailError}
                </span>
              ) : null}
            </label>
            <label
              className="space-y-2 text-base font-semibold text-slate-700 sm:text-xl"
              htmlFor="signup-password"
            >
              Senha
              <div className={`t-input-wrap relative ${passwordError ? "is-error" : ""}`}>
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 10V8a4 4 0 1 1 8 0v2"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                  <rect
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="14"
                    x="5"
                    y="10"
                  />
                </svg>
                <Input
                  id="signup-password"
                  autoComplete="new-password"
                  className={`t-input h-12 rounded-xl border-slate-300 bg-white px-12 text-base text-slate-500 placeholder:text-slate-400 focus:border-[#24784A] focus:ring-[#24784A]/15 sm:h-14 sm:text-2xl ${shakePassword ? "is-shaking" : ""}`}
                  placeholder="Crie uma senha segura"
                  required
                  type="password"
                  value={password}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onChange={(event) => {
                    clearAuthError();
                    setPassword(event.target.value);
                  }}
                />
              </div>
              {passwordError ? (
                <span className="t-error-msg mt-1 block text-sm text-red-600 sm:text-base">
                  {passwordError}
                </span>
              ) : null}
            </label>

            <ErrorBanner message={authError} />

            <Button
              className="mt-1 h-12 rounded-xl bg-[#24784A] text-lg font-bold transition-colors duration-200 hover:bg-[#1f6941] sm:h-14 sm:text-2xl"
              disabled={
                loading || Boolean(nameError) || Boolean(emailError) || Boolean(passwordError)
              }
              type="submit"
            >
              <span className="t-text-swap">{loading ? "Cadastrando..." : "Cadastrar"}</span>
            </Button>
          </form>

          <div className="mt-6 sm:mt-8">
            <div className="flex items-center gap-3 text-sm text-slate-500 sm:text-lg">
              <span className="h-px flex-1 bg-slate-300" />
              <span>Ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="mt-6 text-center text-base text-slate-600 sm:mt-7 sm:text-[31px]">
              Já possui conta?
            </p>
            <Link
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-lg font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 sm:h-14 sm:text-3xl"
              to="/"
            >
              Entrar
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
};
