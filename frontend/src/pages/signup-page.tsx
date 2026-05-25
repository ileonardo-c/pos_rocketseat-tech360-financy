import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { IconMail, IconUserRoundPlus } from "@/assets/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [focused, setFocused] = useState({ name: false, email: false, password: false });
  const sanitizeNameInput = (value: string) => value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");

  const getNameError = (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2) {
      return "Informe seu nome com pelo menos 2 caracteres.";
    }

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (looksLikeEmail) {
      return "Informe um nome válido.";
    }

    const hasValidCharacters = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(normalized);
    if (!hasValidCharacters) {
      return "Use apenas letras no nome.";
    }

    return "";
  };
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

  useEffect(() => {
    if (authError) {
      setSubmitFeedback(authError);
    }
  }, [authError]);

  const isBusy = loading || isSubmitting;

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

  const nameState = nameError
    ? "error"
    : focused.name
      ? "active"
      : name
        ? "filled"
        : touched.name
          ? "active"
          : "empty";
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
          strokeWidth="1.5"
        />
        <rect height="10" rx="2" stroke="currentColor" strokeWidth="1.5" width="14" x="5" y="10" />
      </svg>
    </span>
  );

  const passwordEndIcon = (
    <button
      aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
      className="pointer-events-auto inline-flex h-4 w-4 items-center justify-center rounded text-financy-field-placeholder transition-colors duration-200 ease-out hover:text-financy-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/30 disabled:pointer-events-none disabled:opacity-50"
      data-testid="signup-password-visibility-toggle"
      disabled={isBusy}
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => setIsPasswordVisible((previous) => !previous)}
    >
      {isPasswordVisible ? (
        <svg aria-hidden="true" fill="none" viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M1.3 8c1.2-2.3 3.3-3.5 6.7-3.5s5.5 1.2 6.7 3.5c-1.2 2.3-3.3 3.5-6.7 3.5S2.5 10.3 1.3 8Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ) : (
        <svg aria-hidden="true" fill="none" viewBox="0 0 16 16" className="h-4 w-4">
          <path
            d="M1.3 8c1.2-2.3 3.3-3.5 6.7-3.5s5.5 1.2 6.7 3.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="M6.4 10.4a2 2 0 0 0 3.2 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>
      )}
    </button>
  );

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main
      className="min-h-screen bg-[#f8f9fa] px-4 py-12 text-financy-text-secondary sm:px-6"
      data-testid="signup-page"
    >
      <div className="mx-auto flex w-full max-w-[448px] flex-col items-center gap-8">
        <header>
          <BrandLogo />
        </header>

        <Card
          className="w-full rounded-[12px] border-[#e5e7eb] bg-financy-surface p-[33px] shadow-none"
          data-testid="signup-card"
        >
          <h1
            className="text-center font-sans text-[20px] font-bold leading-[28px] text-[#111827]"
            data-testid="signup-title"
          >
            Criar conta
          </h1>
          <p className="mt-1 text-center text-[16px] leading-[24px] text-[#4b5563]">
            Registre-se para começar a usar o Financy
          </p>
          <form
            className="mt-8 flex flex-col gap-6"
            data-testid="signup-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setTouched({ name: true, email: true, password: true });

              const submitNameError = getNameError(name);
              const submitEmailError = getEmailError(email);
              const submitPasswordError = getPasswordError(password);
              if (submitNameError || submitEmailError || submitPasswordError) {
                return;
              }

              setIsSubmitting(true);
              try {
                const success = await signup({ name: name.trim(), email: email.trim(), password });
                if (!success) {
                  setSubmitFeedback(
                    (current) => current ?? "Não foi possível criar sua conta. Tente novamente.",
                  );
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <Input
              id="signup-name"
              autoComplete="name"
              data-testid="signup-name"
              label="Nome"
              placeholder="Seu nome completo"
              required
              state={nameState}
              helper={nameError || undefined}
              helperError={Boolean(nameError)}
              disabled={isBusy}
              value={name}
              onFocus={() => setFocused((previous) => ({ ...previous, name: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, name: false }));
                setTouched((previous) => ({ ...previous, name: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setSubmitFeedback(null);
                setName(sanitizeNameInput(event.target.value));
              }}
            />

            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              data-testid="signup-email"
              label="Email"
              placeholder="mail@exemplo.com"
              required
              state={emailState}
              startIcon={<IconMail className="h-4 w-4" />}
              helper={emailError || undefined}
              helperError={Boolean(emailError)}
              disabled={isBusy}
              value={email}
              onFocus={() => setFocused((previous) => ({ ...previous, email: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, email: false }));
                setTouched((previous) => ({ ...previous, email: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setSubmitFeedback(null);
                setEmail(event.target.value);
              }}
            />

            <Input
              id="signup-password"
              autoComplete="new-password"
              data-testid="signup-password"
              label="Senha"
              placeholder="Crie uma senha segura"
              required
              state={passwordState}
              startIcon={passwordStartIcon}
              endIcon={passwordEndIcon}
              helper={passwordError || undefined}
              helperError={Boolean(passwordError)}
              disabled={isBusy}
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onFocus={() => setFocused((previous) => ({ ...previous, password: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, password: false }));
                setTouched((previous) => ({ ...previous, password: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setSubmitFeedback(null);
                setPassword(event.target.value);
              }}
            />

            <ErrorBanner message={submitFeedback ?? authError} />

            <Button
              className="mt-0 text-base font-medium"
              disabled={
                isBusy ||
                !name.trim() ||
                !email.trim() ||
                !password.trim() ||
                Boolean(nameError) ||
                Boolean(emailError) ||
                Boolean(passwordError)
              }
              type="submit"
            >
              <span className="inline-flex items-center gap-2">
                {(loading || isSubmitting) && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white transition-opacity duration-200 ease-out"
                  />
                )}
                <span className="t-text-swap">
                  {isBusy ? "Cadastrando..." : "Criar conta"}
                </span>
              </span>
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3 text-sm text-[#6b7280]">
              <span className="h-px flex-1 bg-slate-300" />
              <span>Ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <p className="mt-6 text-center text-[14px] leading-[20px] text-[#4b5563]">
              Já tem uma conta?
            </p>
            <Link
              to="/login"
              data-testid="signup-login-link"
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
              <span className="whitespace-nowrap">Entrar</span>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
};
