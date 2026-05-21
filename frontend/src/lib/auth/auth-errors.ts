export const sessionExpiredMessage = "Sua sessão expirou. Faça login novamente.";

export type AuthErrorRule = {
  messages: string[];
  toUserMessage: string;
};

export const AUTH_ERROR_RULES: AuthErrorRule[] = [
  {
    messages: [
      "unauthenticated",
      "not authenticated",
      "session expired",
      "expired token",
      "não autenticado",
    ],
    toUserMessage: sessionExpiredMessage,
  },
  {
    messages: ["invalid name"],
    toUserMessage: "Por favor, informe um nome válido.",
  },
  {
    messages: ["invalid email"],
    toUserMessage: "Por favor, informe um e-mail válido.",
  },
  {
    messages: ["invalid password"],
    toUserMessage: "A senha deve ter pelo menos 6 caracteres.",
  },
  {
    messages: ["invalid credentials"],
    toUserMessage: "E-mail ou senha inválidos.",
  },
  {
    messages: ["already exists", "already registered", "conflict", "duplicate", "já cadastrado"],
    toUserMessage: "Este e-mail já está em uso.",
  },
];

export const AUTH_FALLBACK_MESSAGES = {
  defaultSession: "Não foi possível validar sua sessão agora. Tente novamente em instantes.",
  defaultAuth: "Não foi possível concluir a autenticação. Tente novamente.",
};

export const normalizeAuthErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message).toLowerCase();
  }
  return "";
};

export const resolveAuthErrorMessage = (error: unknown, fallback: string) => {
  const message = normalizeAuthErrorMessage(error);
  const foundRule = AUTH_ERROR_RULES.find((rule) =>
    rule.messages.some((value) => message.includes(value)),
  );
  if (!foundRule) {
    return fallback;
  }
  return foundRule.toUserMessage;
};

export const isAuthenticationGraphQLError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unauthenticated") ||
    normalized.includes("not authenticated") ||
    normalized.includes("não autenticado")
  );
};
