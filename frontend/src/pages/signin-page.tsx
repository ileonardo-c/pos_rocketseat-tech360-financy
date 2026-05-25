import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";

import { IconMail, IconUserRoundPlus } from "@/assets/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-provider";

export const SigninPage = () => {
  const { user, signin, loading, authError, clearAuthError } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showRegisteredSuccess, setShowRegisteredSuccess] = useState(
    searchParams.get("registered") === "1",
  );
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

  const isBusy = loading || isSubmitting;

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

  const passwordStartIcon = (
    <span className="text-financy-field-placeholder">
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M8 10V8a4 4 0 1 1 8 0v2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );

  const passwordEndIcon = (
    <button
      aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
      className="pointer-events-auto inline-flex h-4 w-4 items-center justify-center rounded text-financy-field-placeholder transition-colors duration-150 hover:text-financy-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/30 disabled:pointer-events-none disabled:opacity-50"
      data-testid="signin-password-visibility-toggle"
      disabled={isBusy}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setIsPasswordVisible((previous) => !previous)}
    >
      {isPasswordVisible ? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M1.3 8c1.2-2.3 3.3-3.5 6.7-3.5s5.5 1.2 6.7 3.5c-1.2 2.3-3.3 3.5-6.7 3.5S2.5 10.3 1.3 8Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M1.3 8c1.2-2.3 3.3-3.5 6.7-3.5s5.5 1.2 6.7 3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="M6.4 10.4a2 2 0 0 0 3.2 0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>
      )}
    </button>
  );

  return (
    <main
      className="min-h-screen bg-[#f8f9fa] px-4 py-12 text-financy-text-secondary sm:px-6"
      data-testid="signin-page"
    >
      <div className="mx-auto flex w-full max-w-[448px] flex-col items-center gap-8">
        <header>
          <BrandLogo />
        </header>

        <Card
          className="w-full rounded-[12px] border-[#e5e7eb] bg-financy-surface p-[33px] shadow-none"
          data-testid="signin-card"
        >
          <h1
            className="text-center font-sans text-[20px] font-bold leading-[28px] text-[#111827]"
            data-testid="signin-title"
          >
            Fazer login
          </h1>
          <p className="mt-1 text-center text-[16px] leading-[24px] text-[#4b5563]">
            Entre na sua conta para continuar
          </p>
          <form
            className="mt-8 flex flex-col gap-6"
            data-testid="signin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setTouched({ email: true, password: true });

              const submitEmailError = getEmailError(email);
              const submitPasswordError = getPasswordError(password);
              if (submitEmailError || submitPasswordError) {
                return;
              }

              setIsSubmitting(true);
              try {
                await signin({ email: email.trim(), password, rememberMe });
              } finally {
                setIsSubmitting(false);
              }
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
              disabled={isBusy}
              onFocus={() => setFocused((previous) => ({ ...previous, email: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, email: false }));
                setTouched((previous) => ({ ...previous, email: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setShowRegisteredSuccess(false);
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
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              state={passwordState}
              startIcon={passwordStartIcon}
              endIcon={passwordEndIcon}
              helper={passwordError || undefined}
              helperError={Boolean(passwordError)}
              disabled={isBusy}
              onFocus={() => setFocused((previous) => ({ ...previous, password: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, password: false }));
                setTouched((previous) => ({ ...previous, password: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setShowRegisteredSuccess(false);
                setPassword(event.target.value);
              }}
            />

            <SuccessBanner
              message={
                showRegisteredSuccess
                  ? "Conta criada com sucesso. Faça login para continuar."
                  : null
              }
            />
            <ErrorBanner message={authError} />

            <div className="flex items-center justify-between text-sm text-financy-muted">
              <Checkbox
                aria-label="Lembrar-me"
                checked={rememberMe}
                data-testid="signin-remember"
                disabled={isBusy}
                label="Lembrar-me"
                onChange={(event) => {
                  setShowRegisteredSuccess(false);
                  setRememberMe(event.target.checked);
                }}
              />
              <span className="text-[14px] font-medium leading-[20px] text-financy-primary">
                Recuperar senha
              </span>
            </div>

            <Button
              className="mt-0 text-base font-medium"
              disabled={
                isBusy || !email.trim() || !password.trim() || Boolean(emailError || passwordError)
              }
              type="submit"
            >
              <span className="t-text-swap">
                {loading || isSubmitting ? "Entrando..." : "Entrar"}
              </span>
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 text-sm text-[#6b7280]">
              <span className="h-px flex-1 bg-slate-300" />
              <span>ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="mt-6 text-center text-[14px] leading-[20px] text-[#4b5563]">
              Ainda não tem uma conta?
            </p>
            <Link
              to="/signup"
              data-testid="signin-create-account-link"
              aria-disabled={isBusy}
              tabIndex={isBusy ? -1 : undefined}
              onClick={(event) => {
                if (isBusy) {
                  event.preventDefault();
                }
              }}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-financy-field-border bg-financy-surface text-[16px] font-medium leading-[24px] text-financy-text-secondary transition duration-200 hover:bg-financy-surface-hover aria-disabled:pointer-events-none aria-disabled:opacity-60"
            >
              <IconUserRoundPlus className="h-[18px] w-[18px] shrink-0 text-financy-text-secondary" />
              <span className="whitespace-nowrap">Criar conta</span>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
};
