import { randomBytes } from "node:crypto";
import type { FastifyReply } from "fastify";

export const AUTH_COOKIE_NAME = "financy_session";
export const AUTH_CSRF_COOKIE_NAME = "financy_csrf";

const DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_COOKIE_SAME_SITE = "Strict";

const resolveAuthCookieSameSite = () => {
  const rawValue = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  switch (rawValue) {
    case "lax":
      return "Lax";
    case "none":
      return "None";
    case "strict":
    case "":
    case undefined:
      return DEFAULT_COOKIE_SAME_SITE;
    default:
      console.warn("Invalid AUTH_COOKIE_SAME_SITE value. Falling back to Strict.");
      return DEFAULT_COOKIE_SAME_SITE;
  }
};

const shouldUseSecureCookie = (sameSite: string) => {
  return process.env.NODE_ENV === "production" || sameSite === "None";
};

const parseJwtExpiresInToSeconds = (value: string) => {
  const trimmed = value.trim();
  const match = /^(\d+)([smhdw]?)$/i.exec(trimmed);
  if (!match) {
    return undefined;
  }

  const amount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  const unit = match[2]?.toLowerCase();
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * DAY_IN_SECONDS;
    case "w":
      return amount * DAY_IN_SECONDS * 7;
    default:
      return amount;
  }
};

const buildCookieParts = (token: string, rememberMe = false) => {
  const expiresInSeconds = rememberMe
    ? parseJwtExpiresInToSeconds(process.env.JWT_EXPIRES_IN || "7d")
    : undefined;
  const sameSite = resolveAuthCookieSameSite();

  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];

  if (shouldUseSecureCookie(sameSite)) {
    parts.push("Secure");
  }

  if (expiresInSeconds && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    parts.push(`Max-Age=${Math.trunc(expiresInSeconds)}`);
    parts.push(`Expires=${new Date(Date.now() + expiresInSeconds * 1000).toUTCString()}`);
  }

  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }

  return parts.join("; ");
};

const buildCsrfCookieParts = (token: string, rememberMe = false) => {
  const expiresInSeconds = rememberMe
    ? parseJwtExpiresInToSeconds(process.env.JWT_EXPIRES_IN || "7d")
    : undefined;
  const sameSite = resolveAuthCookieSameSite();

  const parts = [
    `${AUTH_CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `SameSite=${sameSite}`,
  ];

  if (shouldUseSecureCookie(sameSite)) {
    parts.push("Secure");
  }

  if (expiresInSeconds && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    parts.push(`Max-Age=${Math.trunc(expiresInSeconds)}`);
    parts.push(`Expires=${new Date(Date.now() + expiresInSeconds * 1000).toUTCString()}`);
  }

  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }

  return parts.join("; ");
};

const applyCookies = (reply: FastifyReply, cookies: string[]) => {
  const existing = reply.raw.getHeader("set-cookie");
  const current = Array.isArray(existing)
    ? existing.map(String)
    : existing
      ? [String(existing)]
      : [];
  reply.raw.setHeader("Set-Cookie", [...current, ...cookies]);
};

export const generateCsrfToken = () => randomBytes(32).toString("hex");

export const setAuthSessionCookie = (reply: FastifyReply, token: string, rememberMe = false) => {
  setAuthSessionCookies(reply, token, rememberMe);
};

export const setAuthSessionCookies = (
  reply: FastifyReply,
  authToken: string,
  rememberMe = false,
  csrfToken = generateCsrfToken(),
) => {
  const cookieParts = [
    buildCookieParts(authToken, rememberMe),
    buildCsrfCookieParts(csrfToken, rememberMe),
  ];
  applyCookies(reply, cookieParts);
  return csrfToken;
};

export const setCsrfSessionCookie = (
  reply: FastifyReply,
  rememberMe = false,
  csrfToken = generateCsrfToken(),
) => {
  applyCookies(reply, [buildCsrfCookieParts(csrfToken, rememberMe)]);
  return csrfToken;
};

export const clearAuthSessionCookie = (reply: FastifyReply) => {
  const cookies = [buildAuthSessionClearCookie(), buildCsrfSessionClearCookie()];
  applyCookies(reply, cookies);
};

const buildAuthSessionClearCookie = () => {
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  const sameSite = resolveAuthCookieSameSite();
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (shouldUseSecureCookie(sameSite)) {
    cookieParts.push("Secure");
  }
  if (cookieDomain) {
    cookieParts.push(`Domain=${cookieDomain}`);
  }
  return cookieParts.join("; ");
};

const buildCsrfSessionClearCookie = () => {
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  const sameSite = resolveAuthCookieSameSite();
  const cookieParts = [
    `${AUTH_CSRF_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    `SameSite=${sameSite}`,
  ];

  if (cookieDomain) {
    cookieParts.push(`Domain=${cookieDomain}`);
  }

  if (shouldUseSecureCookie(sameSite)) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
};

const readCookieValue = (cookieHeader: string | null | undefined, cookieName: string) => {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.split("=");
    const name = rawName?.trim();
    if (!name || name !== cookieName) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
};

export const readAuthSessionTokenFromCookie = (cookieHeader?: string | null) => {
  return readCookieValue(cookieHeader, AUTH_COOKIE_NAME);
};

export const readCsrfSessionTokenFromCookie = (cookieHeader?: string | null) => {
  return readCookieValue(cookieHeader, AUTH_CSRF_COOKIE_NAME);
};
