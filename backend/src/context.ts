import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { readAuthSessionTokenFromCookie, readCsrfSessionTokenFromCookie } from "./lib/auth-cookie";
import { getRequiredEnv } from "./lib/env";
import { prisma } from "./prisma/client";

export interface GraphQLContext {
  prisma: typeof prisma;
  userId?: string;
  reply?: FastifyReply;
  requestedIp?: string | null;
  userAgent?: string | null;
  requestOrigin?: string | null;
  requestHost?: string | null;
  csrfToken?: string;
  authSource?: "header" | "cookie" | "none";
}

interface TokenPayload {
  sub?: string;
}

export async function buildContext(
  req: FastifyRequest,
  reply?: FastifyReply,
): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  const cookieToken = readAuthSessionTokenFromCookie(req.headers.cookie);
  const requestedIp = req.ip;
  const userAgent = req.headers["user-agent"]?.toString() ?? null;
  const requestOrigin = req.headers.origin?.toString() ?? null;
  const requestHost =
    req.headers["x-forwarded-host"]?.toString() ?? req.headers.host?.toString() ?? null;

  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
  const token = headerToken || cookieToken;
  const authSource = headerToken ? "header" : cookieToken ? "cookie" : "none";
  const csrfToken = readCsrfSessionTokenFromCookie(req.headers.cookie);
  if (!token) {
    return {
      prisma,
      reply,
      requestedIp,
      userAgent,
      requestOrigin,
      requestHost,
      csrfToken,
      authSource,
    };
  }
  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    return {
      prisma,
      reply,
      userId: payload.sub,
      requestedIp,
      userAgent,
      requestOrigin,
      requestHost,
      csrfToken,
      authSource,
    };
  } catch {
    return {
      prisma,
      reply,
      requestedIp,
      userAgent,
      requestOrigin,
      requestHost,
      csrfToken,
      authSource,
    };
  }
}
