import { type FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { IconEyeClosed, IconMail } from "@/assets/icons";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBanner, SuccessBanner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { resolveAuthErrorMessage } from "@/lib/auth/auth-errors";
import { useAuth } from "@/lib/auth/auth-provider";
import { REQUEST_PASSWORD_RESET_MUTATION, RESET_PASSWORD_MUTATION } from "@/lib/graphql/operations";
import { useMutation } from "@apollo/client";

type RecoveryStep = "request" | "confirm";
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_MIN_HELPER = `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;

export const ForgotPasswordPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [requestPasswordReset] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);
  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION);
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    code: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [focused, setFocused] = useState({
    email: false,
    code: false,
    newPassword: false,
    confirmPassword: false,
  });

  const getEmailError = (value: string) => {
    if (!value.trim()) {
      return "Informe seu e-mail.";
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Informe um e-mail válido.";
  };

  const getCodeError = (value: string) => {
    if (!value.trim()) {
      return "Informe o código de recuperação.";
    }
    return /^\d{6}$/.test(value) ? "" : "Informe um código com 6 dígitos.";
  };

  const getPasswordError = (value: string) => {
    if (!value.trim()) {
      return "Informe a nova senha.";
    }
    return value.length >= MIN_PASSWORD_LENGTH
      ? ""
      : `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
  };

  const getConfirmPasswordError = (value: string) => {
    if (!value.trim()) {
      return "Confirme a nova senha.";
    }
    return value === newPassword ? "" : "As senhas não coincidem.";
  };

  const emailError = useMemo(
    () => (touched.email ? getEmailError(email) : ""),
    [email, touched.email],
  );
  const codeError = useMemo(() => (touched.code ? getCodeError(code) : ""), [code, touched.code]);
  const newPasswordError = useMemo(
    () => (touched.newPassword ? getPasswordError(newPassword) : ""),
    [newPassword, touched.newPassword],
  );
  const confirmPasswordError = useMemo(
    () => (touched.confirmPassword ? getConfirmPasswordError(confirmPassword) : ""),
    [confirmPassword, touched.confirmPassword],
  );

  const emailState = emailError
    ? "error"
    : focused.email
      ? "active"
      : email
        ? "filled"
        : touched.email
          ? "active"
          : "empty";
  const codeState = codeError
    ? "error"
    : focused.code
      ? "active"
      : code
        ? "filled"
        : touched.code
          ? "active"
          : "empty";
  const newPasswordState = newPasswordError
    ? "error"
    : focused.newPassword
      ? "active"
      : newPassword
        ? "filled"
        : touched.newPassword
          ? "active"
          : "empty";
  const confirmPasswordState = confirmPasswordError
    ? "error"
    : focused.confirmPassword
      ? "active"
      : confirmPassword
        ? "filled"
        : touched.confirmPassword
          ? "active"
          : "empty";

  const isBusy = isRequesting || isResetting;

  const requestErrorFallback = "Não foi possível solicitar o código agora.";
  const resetErrorFallback = "Não foi possível redefinir a senha agora.";

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div>Carregando...</div>;
  }

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched((previous) => ({ ...previous, email: true }));
    const validationError = getEmailError(email);
    if (validationError) {
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestPasswordReset({ variables: { input: { email: email.trim() } } });
      setSuccessMessage("Se o e-mail estiver cadastrado, enviamos um código de verificação.");
      setStep("confirm");
    } catch (error) {
      setErrorMessage(resolveAuthErrorMessage(error, requestErrorFallback));
    } finally {
      setIsRequesting(false);
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, code: true, newPassword: true, confirmPassword: true });

    const hasValidationError =
      Boolean(codeError) || Boolean(newPasswordError) || Boolean(confirmPasswordError);
    if (hasValidationError) {
      return;
    }

    setIsResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await resetPassword({
        variables: {
          input: {
            email: email.trim(),
            code,
            newPassword: newPassword.trim(),
          },
        },
      });
      navigate("/login?reset=1");
    } catch (error) {
      setErrorMessage(resolveAuthErrorMessage(error, resetErrorFallback));
    } finally {
      setIsResetting(false);
    }
  };

  const clearErrorAndSuccess = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const backToEmailRequest = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
    setTouched({
      email: true,
      code: false,
      newPassword: false,
      confirmPassword: false,
    });
    setFocused({
      email: false,
      code: false,
      newPassword: false,
      confirmPassword: false,
    });
    setStep("request");
  };

  return (
    <main
      className="min-h-screen bg-[#f8f9fa] px-4 py-12 text-financy-text-secondary sm:px-6"
      data-testid="forgot-password-page"
    >
      <div className="mx-auto flex w-full max-w-[448px] flex-col items-center gap-8">
        <header>
          <BrandLogo />
        </header>

        <Card
          className="w-full rounded-[12px] border-[#e5e7eb] bg-financy-surface p-[33px] shadow-none"
          data-testid="forgot-password-card"
        >
          <h1 className="text-center font-sans text-[20px] font-bold leading-[28px] text-[#111827]">
            {step === "request" ? "Recuperar senha" : "Redefinir senha"}
          </h1>
          <p className="mt-1 text-center text-[16px] leading-[24px] text-[#4b5563]">
            {step === "request"
              ? "Informe seu e-mail para receber um código de verificação."
              : `Digite o código enviado para ${email}.`}
          </p>

          {step === "request" ? (
            <form className="mt-8 flex flex-col gap-6" onSubmit={submitRequest}>
              <Input
                id="forgot-password-email"
                autoComplete="email"
                data-testid="forgot-password-email"
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
                  clearErrorAndSuccess();
                  setEmail(event.target.value);
                }}
              />

              <ErrorBanner message={errorMessage} />

              <Button
                className="mt-0 text-base font-medium"
                disabled={isBusy || !email.trim() || Boolean(emailError)}
                type="submit"
              >
                <span className="t-text-swap">
                  {isRequesting ? "Enviando..." : "Enviar código"}
                </span>
              </Button>
            </form>
          ) : (
            <form className="mt-8 flex flex-col gap-6" onSubmit={submitReset}>
              <Input
                id="forgot-password-code"
                data-testid="forgot-password-code"
                label="Código"
                placeholder="Digite o código de 6 dígitos"
                required
                value={code}
                state={codeState}
                helper={codeError || undefined}
                helperError={Boolean(codeError)}
                disabled={isBusy}
                onFocus={() => setFocused((previous) => ({ ...previous, code: true }))}
                onBlur={() => {
                  setFocused((previous) => ({ ...previous, code: false }));
                  setTouched((previous) => ({ ...previous, code: true }));
                }}
                onChange={(event) => {
                  clearErrorAndSuccess();
                  setCode(event.target.value.replace(/\D+/g, "").slice(0, 6));
                }}
              />

              <Input
                id="forgot-password-new-password"
                data-testid="forgot-password-new-password"
                label="Nova senha"
                placeholder="Digite a nova senha"
                required
                type={isPasswordVisible ? "text" : "password"}
                value={newPassword}
                state={newPasswordState}
                helper={newPasswordError || PASSWORD_MIN_HELPER}
                helperError={Boolean(newPasswordError)}
                disabled={isBusy}
                onFocus={() => setFocused((previous) => ({ ...previous, newPassword: true }))}
                onBlur={() => {
                  setFocused((previous) => ({ ...previous, newPassword: false }));
                  setTouched((previous) => ({ ...previous, newPassword: true }));
                }}
                onChange={(event) => {
                  clearErrorAndSuccess();
                  setNewPassword(event.target.value);
                }}
                endIcon={
                  <button
                    aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                    className="pointer-events-auto inline-flex h-4 w-4 items-center justify-center rounded text-financy-field-placeholder transition-colors duration-150 hover:text-financy-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/30 disabled:pointer-events-none disabled:opacity-50"
                    disabled={isBusy}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setIsPasswordVisible((previous) => !previous)}
                    type="button"
                  >
                    {isPasswordVisible ? (
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
                        <path
                          d="M8 3.75C4.13 3.75 1 8 1 8s3.13 4.25 7 4.25 7-4.25 7-4.25S11.87 3.75 8 3.75Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.2"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    ) : (
                      <IconEyeClosed className="h-[9px] w-4 text-[#374151]" />
                    )}
                  </button>
                }
              />

              <Input
                id="forgot-password-confirm-password"
                data-testid="forgot-password-confirm-password"
                label="Confirmar nova senha"
                placeholder="Repita a nova senha"
                required
                type={isConfirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                state={confirmPasswordState}
                helper={confirmPasswordError || undefined}
                helperError={Boolean(confirmPasswordError)}
                disabled={isBusy}
                onFocus={() => setFocused((previous) => ({ ...previous, confirmPassword: true }))}
                onBlur={() => {
                  setFocused((previous) => ({ ...previous, confirmPassword: false }));
                  setTouched((previous) => ({ ...previous, confirmPassword: true }));
                }}
                onChange={(event) => {
                  clearErrorAndSuccess();
                  setConfirmPassword(event.target.value);
                }}
                endIcon={
                  <button
                    aria-label={isConfirmPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                    className="pointer-events-auto inline-flex h-4 w-4 items-center justify-center rounded text-financy-field-placeholder transition-colors duration-150 hover:text-financy-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-financy-primary/30 disabled:pointer-events-none disabled:opacity-50"
                    disabled={isBusy}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setIsConfirmPasswordVisible((previous) => !previous)}
                    type="button"
                  >
                    {isConfirmPasswordVisible ? (
                      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
                        <path
                          d="M8 3.75C4.13 3.75 1 8 1 8s3.13 4.25 7 4.25 7-4.25 7-4.25S11.87 3.75 8 3.75Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.2"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    ) : (
                      <IconEyeClosed className="h-[9px] w-4 text-[#374151]" />
                    )}
                  </button>
                }
              />

              <SuccessBanner message={successMessage} />
              <ErrorBanner message={errorMessage} />

              <Button
                className="mt-0 text-base font-medium"
                disabled={
                  isBusy ||
                  Boolean(codeError) ||
                  Boolean(newPasswordError) ||
                  Boolean(confirmPasswordError) ||
                  !code ||
                  !newPassword ||
                  !confirmPassword
                }
                type="submit"
              >
                <span className="t-text-swap">
                  {isResetting ? "Redefinindo..." : "Redefinir senha"}
                </span>
              </Button>
            </form>
          )}

          <div className="mt-8">
            <div className="flex items-center gap-3 text-sm text-[#6b7280]">
              <span className="h-px flex-1 bg-slate-300" />
              <span>ou</span>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
            <Link
              to="/login"
              data-testid="forgot-password-login-link"
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-financy-field-border bg-financy-surface text-[16px] font-medium leading-[24px] text-financy-text-secondary transition duration-200 hover:bg-financy-surface-hover"
            >
              Voltar para o login
            </Link>
            {step === "confirm" ? (
              <button
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-financy-field-border bg-financy-surface text-[16px] font-medium leading-[24px] text-financy-text-secondary transition duration-200 hover:bg-financy-surface-hover disabled:opacity-60"
                type="button"
                disabled={isBusy}
                onClick={backToEmailRequest}
              >
                Alterar e-mail
              </button>
            ) : null}
          </div>
        </Card>
      </div>
    </main>
  );
};
