import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { IconMail } from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { useAuth } from "@/lib/auth/auth-provider";

export const SignupPage = () => {
  const { user, signup, loading, authError, clearAuthError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [focused, setFocused] = useState({ name: false, email: false, password: false });

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

  const passwordVisibilityIcon = (
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

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen bg-financy-page px-4 py-8 text-financy-text-secondary sm:py-12">
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

        <Card className="border-financy-border bg-financy-surface p-6 shadow-none transition-all duration-300 ease-out sm:p-9">
          <h1 className="text-center text-3xl font-bold leading-[1.15] text-financy-text sm:text-[40px]">
            Criar conta
          </h1>
          <p className="mt-2 text-center text-base leading-[1.35] text-financy-muted sm:mt-3 sm:text-[34px] sm:leading-[1.15]">
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
                return;
              }

              await signup({ name: name.trim(), email: email.trim(), password });
            }}
          >
            <Input
              id="signup-name"
              autoComplete="name"
              label="Nome"
              placeholder="Seu nome completo"
              required
              state={nameState}
              startIcon={<IconMail className="h-4 w-4" />}
              helper={nameError || undefined}
              helperError={Boolean(nameError)}
              value={name}
              onFocus={() => setFocused((previous) => ({ ...previous, name: true }))}
              onBlur={() => {
                setFocused((previous) => ({ ...previous, name: false }));
                setTouched((previous) => ({ ...previous, name: true }));
              }}
              onChange={(event) => {
                clearAuthError();
                setName(event.target.value);
              }}
            />

            <Input
              id="signup-email"
              autoComplete="email"
              label="Email"
              placeholder="mail@exemplo.com"
              required
              state={emailState}
              startIcon={<IconMail className="h-4 w-4" />}
              helper={emailError || undefined}
              helperError={Boolean(emailError)}
              value={email}
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
              id="signup-password"
              autoComplete="new-password"
              label="Senha"
              placeholder="Crie uma senha segura"
              required
              state={passwordState}
              startIcon={passwordVisibilityIcon}
              helper={passwordError || undefined}
              helperError={Boolean(passwordError)}
              type="password"
              value={password}
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

            <Button
              className="mt-1 text-lg font-bold sm:h-14 sm:text-2xl"
              disabled={
                loading ||
                !name.trim() ||
                !email.trim() ||
                !password.trim() ||
                Boolean(nameError) ||
                Boolean(emailError) ||
                Boolean(passwordError)
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
            <p className="mt-6 text-center text-base text-financy-muted sm:mt-7 sm:text-[31px]">
              Já possui conta?
            </p>
            <TextLink
              asChild
              className="mt-4 h-12 w-full items-center justify-center gap-2 rounded-xl border border-financy-field-border text-lg font-semibold text-financy-text transition duration-200 hover:bg-financy-surface-hover"
            >
              <Link className="inline-flex" to="/">
                Entrar
              </Link>
            </TextLink>
          </div>
        </Card>
      </div>
    </main>
  );
};
