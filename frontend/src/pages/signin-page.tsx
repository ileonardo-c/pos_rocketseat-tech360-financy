import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { IconMail } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [focused, setFocused] = useState({ email: false, password: false });

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
    clearAuthError();
  }, [clearAuthError]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const emailState = emailError
    ? "error"
    : focused.email
      ? "active"
      : email
        ? "filled"
        : touched.email
          ? "active"
          : "empty";

  const passwordState = passwordError
    ? "error"
    : focused.password
      ? "active"
      : password
        ? "filled"
        : touched.password
          ? "active"
          : "empty";

  const passwordEndIcon = (
    <span className="text-financy-field-placeholder">
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" className="h-4 w-4">
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
  );

  return (
    <main
      className="min-h-screen bg-financy-page px-4 py-6 text-financy-text-secondary sm:px-6 sm:py-10"
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
          className="w-full border-financy-border bg-financy-surface p-6 shadow-none sm:p-8"
          data-testid="signin-card"
        >
          <h1
            className="text-center font-jakarta text-3xl font-bold leading-[1.12] text-financy-text sm:text-[46px] sm:leading-[1.08]"
            data-testid="signin-title"
          >
            Fazer login
          </h1>
          <p className="mt-3 text-center leading-[1.35] text-financy-muted sm:mt-2 sm:text-[18px] sm:leading-[1.35]">
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
                return;
              }

              await signin({ email: email.trim(), password, rememberMe });
            }}
          >
            <Input
              id="signin-email"
              autoComplete="email"
              data-testid="signin-email"
              label="E-mail"
              placeholder="mail@exemplo.com"
              required
              type="email"
              value={email}
              state={emailState}
              startIcon={<IconMail className="h-4 w-4" />}
              helper={emailError || undefined}
              helperError={Boolean(emailError)}
              onFocus={() => setFocused((previous) => ({ ...previous, email: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, email: false }));
                setTouched((previous) => ({ ...previous, email: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setEmail(event.target.value);
              }}
            />

            <Input
              id="signin-password"
              autoComplete="current-password"
              data-testid="signin-password"
              label="Senha"
              placeholder="Digite sua senha"
              required
              type="password"
              value={password}
              state={passwordState}
              endIcon={passwordEndIcon}
              helper={passwordError || undefined}
              helperError={Boolean(passwordError)}
              onFocus={() => setFocused((previous) => ({ ...previous, password: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, password: false }));
                setTouched((previous) => ({ ...previous, password: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setPassword(event.target.value);
              }}
            />

            <ErrorBanner message={authError} />

            <div className="flex items-center justify-between text-sm text-financy-muted sm:text-[18px]">
              <Checkbox
                aria-label="Lembrar-me"
                checked={rememberMe}
                data-testid="signin-remember"
                label="Lembrar-me"
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span className="font-semibold text-financy-primary">Recuperar senha</span>
            </div>

            <Button
              className="mt-1 text-lg font-bold"
              disabled={
                loading || !email.trim() || !password.trim() || Boolean(emailError || passwordError)
              }
              type="submit"
            >
              <span className="t-text-swap">{loading ? "Entrando..." : "Entrar"}</span>
            </Button>
          </form>

          <div className="mt-7 sm:mt-8">
            <div className="flex items-center gap-3 text-sm text-[#6b7280] sm:text-[18px]">
              <span className="h-px flex-1 bg-slate-300" />
              <span>Ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="mt-7 text-center text-base text-financy-muted sm:text-[18px] sm:leading-[1.2]">
              Ainda não tem uma conta?
            </p>
            <TextLink
              asChild
              className="mt-4 h-12 w-full items-center justify-center rounded-xl border border-financy-field-border text-[18px] font-semibold text-financy-text transition duration-200 hover:bg-financy-surface-hover"
              data-testid="signin-create-account-link"
            >
              <Link to="/signup" className="inline-flex w-full">
                <span className="text-sm font-medium text-financy-primary">Criar conta</span>
              </Link>
            </TextLink>
          </div>
        </Card>
      </div>
    </main>
  );
};
