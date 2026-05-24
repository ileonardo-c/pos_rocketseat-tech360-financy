import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);
  const [shakeNonce, setShakeNonce] = useState({ email: 0, password: 0 });

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
    <main
      className="min-h-screen bg-[#f2f3f5] px-4 py-6 text-slate-700 sm:px-6 sm:py-10"
      data-testid="signin-page"
    >
      <div className="mx-auto flex w-full max-w-[448px] flex-col items-center pt-4 sm:pt-2">
        <header className="mb-7 flex items-center justify-center gap-3 text-[#24784A] sm:mb-8">
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
          <span className="text-3xl font-black uppercase leading-none tracking-[0.02em] sm:text-[44px]">
            Financy
          </span>
        </header>

        <Card
          className="w-full rounded-[14px] border border-[#d0d5dd] bg-[#f5f5f6] px-5 py-7 shadow-none sm:px-8 sm:py-8"
          data-testid="signin-card"
        >
          <h1
            className="text-center text-3xl font-bold leading-[1.12] text-[#1f2937] sm:text-[46px] sm:leading-[1.08]"
            data-testid="signin-title"
          >
            Fazer login
          </h1>
          <p className="mt-3 text-center text-base leading-[1.35] text-[#4b5563] sm:mt-2 sm:text-[18px] sm:leading-[1.35]">
            Entre na sua conta para continuar
          </p>
          <form
            className="mt-8 flex flex-col gap-5 sm:mt-9"
            data-testid="signin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setTouched({ email: true, password: true });

              const submitEmailError = getEmailError(email);
              const submitPasswordError = getPasswordError(password);
              if (submitEmailError || submitPasswordError) {
                setShakeNonce((prev) => ({
                  email: submitEmailError ? prev.email + 1 : prev.email,
                  password: submitPasswordError ? prev.password + 1 : prev.password,
                }));
                return;
              }

              await signin({ email: email.trim(), password, rememberMe });
            }}
          >
            <label
              className="space-y-2 text-base font-semibold text-[#374151] sm:text-[18px] sm:leading-[1.2]"
              htmlFor="signin-email"
            >
              E-mail
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
                  id="signin-email"
                  autoComplete="email"
                  className={`t-input h-12 rounded-[10px] border-[#b8c0cc] bg-[#f4f5f7] pl-12 text-base text-[#334155] placeholder:text-[#9ca3af] focus:border-[#24784A] focus:ring-2 focus:ring-[#24784A]/20 sm:h-[56px] sm:text-[18px] ${shakeEmail ? "is-shaking" : ""}`}
                  data-testid="signin-email"
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
              className="space-y-2 text-base font-semibold text-[#374151] sm:text-[18px] sm:leading-[1.2]"
              htmlFor="signin-password"
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
                  id="signin-password"
                  autoComplete="current-password"
                  className={`t-input h-12 rounded-[10px] border-[#b8c0cc] bg-[#f4f5f7] px-12 text-base text-[#334155] placeholder:text-[#9ca3af] focus:border-[#24784A] focus:ring-2 focus:ring-[#24784A]/20 sm:h-[56px] sm:text-[18px] ${shakePassword ? "is-shaking" : ""}`}
                  data-testid="signin-password"
                  placeholder="Digite sua senha"
                  required
                  type="password"
                  value={password}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onChange={(event) => {
                    clearAuthError();
                    setPassword(event.target.value);
                  }}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M2 14c2-4 5.33-6 10-6s8 2 10 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M9.4 15.5a3 3 0 0 0 5.2 0"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.6"
                    />
                  </svg>
                </span>
              </div>
              {passwordError ? (
                <span className="t-error-msg mt-1 block text-sm text-red-600 sm:text-base">
                  {passwordError}
                </span>
              ) : null}
            </label>

            <ErrorBanner message={authError} />

            <div className="flex items-center justify-between text-sm text-[#4b5563] sm:text-[18px]">
              <label className="flex flex-row items-center gap-2 text-inherit">
                <input
                  className="h-[18px] w-[18px] rounded-[4px] border-[#b8c0cc] text-[#24784A] focus:ring-[#24784A]/20"
                  data-testid="signin-remember"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Lembrar-me</span>
              </label>
              <span className="font-semibold text-[#24784A]">Recuperar senha</span>
            </div>

            <button
              className="mt-1 h-12 rounded-[10px] bg-[#24784A] px-4 text-lg font-bold text-white transition-colors duration-200 hover:bg-[#1f6941] disabled:cursor-not-allowed disabled:opacity-50 sm:h-[56px] sm:text-[18px]"
              data-testid="signin-submit"
              disabled={loading || Boolean(emailError) || Boolean(passwordError)}
              type="submit"
            >
              <span className="t-text-swap">{loading ? "Entrando..." : "Entrar"}</span>
            </button>
          </form>

          <div className="mt-7 sm:mt-8">
            <div className="flex items-center gap-3 text-sm text-[#6b7280] sm:text-[18px]">
              <span className="h-px flex-1 bg-slate-300" />
              <span>Ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="mt-7 text-center text-base text-[#4b5563] sm:text-[18px] sm:leading-[1.2]">
              Ainda não tem uma conta?
            </p>
            <Link
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#b8c0cc] text-lg font-semibold text-[#374151] transition duration-200 hover:bg-slate-50 sm:h-[56px] sm:text-[18px]"
              data-testid="signin-create-account-link"
              to="/signup"
            >
              <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 13a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 13zm0 0c-3.3 0-6 2.01-6 4.5V19h9"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M19 14v6m-3-3h6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              Criar conta
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
};
