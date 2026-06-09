const sessionExpiredMessage = "Sua sessão expirou. Faça login novamente.";

type AuthErrorRule = {
  codes: string[];
  toUserMessage: string;
};

const AUTH_ERROR_RULES: AuthErrorRule[] = [
  {
    codes: [
      "AUTH_UNAUTHENTICATED",
      "UNAUTHENTICATED",
      "AUTH_TOKEN_EXPIRED",
      "AUTH_USER_NOT_FOUND",
      "AUTH_NOT_FOUND",
      "CATEGORY_UNAUTHENTICATED",
    ],
    toUserMessage: sessionExpiredMessage,
  },
  {
    codes: [
      "AUTH_INVALID_NAME",
      "AUTH_INVALID_EMAIL",
      "AUTH_INVALID_PASSWORD",
      "AUTH_INVALID_PROFILE_UPDATE",
      "PASSWORD_RESET_CODE_INVALID",
      "PASSWORD_RESET_CODE_EXPIRED",
      "PASSWORD_RESET_CODE_EXHAUSTED",
    ],
    toUserMessage: "Há informações inválidas no formulário.",
  },
  {
    codes: ["AUTH_INVALID_CREDENTIALS"],
    toUserMessage: "E-mail ou senha inválidos.",
  },
  {
    codes: ["AUTH_EMAIL_ALREADY_REGISTERED"],
    toUserMessage: "Esta conta já está cadastrada.",
  },
  {
    codes: ["PASSWORD_RESET_EMAIL_FAILED", "CONFIG_ERROR"],
    toUserMessage: "Não foi possível enviar o e-mail agora. Tente novamente.",
  },
  {
    codes: [
      "PASSWORD_RESET_REQUEST_COOLDOWN",
      "UNPROCESSABLE_ENTITY",
      "BAD_REQUEST",
      "VALIDATION_ERROR",
    ],
    toUserMessage: "Aguarde um momento antes de solicitar um novo código.",
  },
];

export const AUTH_FALLBACK_MESSAGES = {
  defaultSession: "Não foi possível validar sua sessão agora. Tente novamente em instantes.",
  defaultAuth:
    "Não foi possível concluir a autenticação agora. Verifique os dados e tente novamente.",
};

const toLowerCaseString = (value: unknown): string =>
  typeof value === "string" ? value.toLowerCase() : "";

const pickAuthErrorCode = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const topLevelExtensionCode = toLowerCaseString(
    (error as { extensions?: { code?: unknown } }).extensions?.code,
  );
  if (topLevelExtensionCode) {
    return topLevelExtensionCode.toUpperCase();
  }

  const directCode = toLowerCaseString((error as { code?: unknown }).code);
  if (directCode) {
    return directCode.toUpperCase();
  }

  const graphQLErrors = (error as { graphQLErrors?: unknown[] }).graphQLErrors;
  const firstGraphQLError = Array.isArray(graphQLErrors) ? graphQLErrors[0] : null;
  if (firstGraphQLError && typeof firstGraphQLError === "object") {
    const extensionCode = toLowerCaseString(
      (firstGraphQLError as { extensions?: { code?: unknown } }).extensions?.code,
    );
    if (extensionCode) {
      return extensionCode.toUpperCase();
    }

    const nestedCode = toLowerCaseString((firstGraphQLError as { code?: unknown }).code);
    if (nestedCode) {
      return nestedCode.toUpperCase();
    }
  }

  return "";
};

const pickAuthErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return toLowerCaseString(error.message);
  }

  if (typeof error === "string") {
    return toLowerCaseString(error);
  }

  if (!error || typeof error !== "object") {
    return "";
  }

  const errorLike = error as { message?: unknown; graphQLErrors?: unknown[] };
  const directMessage = toLowerCaseString(errorLike.message);
  if (directMessage) {
    return directMessage;
  }

  const graphQLErrors = errorLike.graphQLErrors;
  const firstGraphQLError = Array.isArray(graphQLErrors) ? graphQLErrors[0] : null;
  if (firstGraphQLError && typeof firstGraphQLError === "object") {
    return toLowerCaseString((firstGraphQLError as { message?: unknown }).message);
  }

  return "";
};

const normalizeAuthErrorMessage = (error: unknown) => {
  return pickAuthErrorMessage(error);
};

export const resolveAuthErrorMessage = (error: unknown, fallback: string) => {
  const code = pickAuthErrorCode(error);

  const foundRule = AUTH_ERROR_RULES.find((rule) => {
    return rule.codes.some((value) => value === code);
  });

  if (!foundRule) {
    return fallback;
  }

  return foundRule.toUserMessage;
};

export const isAuthenticationGraphQLError = (error: unknown) => {
  const code = pickAuthErrorCode(error);
  const sessionErrorCodes = [
    "AUTH_UNAUTHENTICATED",
    "UNAUTHENTICATED",
    "AUTH_TOKEN_EXPIRED",
    "CATEGORY_UNAUTHENTICATED",
  ];
  if (code && (sessionErrorCodes.includes(code) || code.endsWith("_UNAUTHENTICATED"))) {
    return true;
  }

  const message = normalizeAuthErrorMessage(error);
  return (
    message.includes("unauthenticated") ||
    message.includes("not authenticated") ||
    message.includes("session expired") ||
    message.includes("user not found") ||
    message.includes("não autenticado")
  );
};
