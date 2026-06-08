import { createHash, timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { FastifyReply } from "fastify";
import mercurius from "mercurius";
import { buildContext } from "./context";
import { resolvers, typeDefs } from "./graphql/index";
import {
  readAuthSessionTokenFromCookie,
  readCsrfSessionTokenFromCookie,
  setCsrfSessionCookie,
} from "./lib/auth-cookie";
import { assertProductionSecurityConfig, getRequiredEnv } from "./lib/env";
import { AppError } from "./lib/errors";
import { analyzeGraphqlOperation } from "./lib/graphql-operation-security";
import type { GraphQLOperationSecurityAnalysis } from "./lib/graphql-operation-security";
import { getStorageConfig } from "./lib/storage-env";
import { prisma } from "./prisma/client";

getRequiredEnv("DATABASE_URL");
getRequiredEnv("JWT_SECRET");
getStorageConfig();
assertProductionSecurityConfig();

const app = Fastify({ logger: true });

const rateLimitDefaults = {
  global: {
    maxRequests: 120,
    windowMs: 60_000,
  },
  auth: {
    maxRequests: 30,
    windowMs: 60_000,
  },
};

const parseRateLimitEnv = (name: string, fallback: number) => {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

type RateWindowState = {
  count: number;
  startedAt: number;
};

const createRateWindowState = (maxRequests: number, windowMs: number) => {
  const buckets = new Map<string, RateWindowState>();
  return (identity: string) => {
    const now = Date.now();
    const current = buckets.get(identity);

    if (!current || now - current.startedAt > windowMs) {
      buckets.set(identity, {
        count: 1,
        startedAt: now,
      });
      return { allowed: true, remainingWindowMs: windowMs };
    }

    const updatedCount = current.count + 1;
    current.count = updatedCount;

    if (updatedCount <= maxRequests) {
      return {
        allowed: true,
        remainingWindowMs: Math.max(windowMs - (now - current.startedAt), 0),
      };
    }

    return {
      allowed: false,
      remainingWindowMs: Math.max(windowMs - (now - current.startedAt), 0),
    };
  };
};

const getHeaderValue = (value: string | string[] | undefined) => {
  if (!value) {
    return "";
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value;
};

const secureStringEquals = (a?: string, b?: string) => {
  const left = createHash("sha256")
    .update(a ?? "")
    .digest();
  const right = createHash("sha256")
    .update(b ?? "")
    .digest();
  return timingSafeEqual(left, right);
};

const normalizeAuthTokenSources = (req: {
  headers?: { authorization?: string | undefined; cookie?: string | undefined };
}) => {
  const authHeader = req.headers?.authorization;
  const cookieHeader = req.headers?.cookie;
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
  const cookieToken = readAuthSessionTokenFromCookie(cookieHeader);

  if (headerToken) {
    return { source: "header" as const, headerToken, cookieToken };
  }

  return {
    source: cookieToken ? ("cookie" as const) : ("none" as const),
    headerToken: "",
    cookieToken,
  };
};

const getCsrfTokenHeader = (headers: Record<string, string | string[] | undefined> | undefined) => {
  return getHeaderValue(headers?.["x-csrf-token"]);
};

const globalRateLimiter = createRateWindowState(
  parseRateLimitEnv("RATE_LIMIT_GLOBAL_MAX_REQUESTS", rateLimitDefaults.global.maxRequests),
  parseRateLimitEnv("RATE_LIMIT_GLOBAL_WINDOW_MS", rateLimitDefaults.global.windowMs),
);
const authRateLimiter = createRateWindowState(
  parseRateLimitEnv("RATE_LIMIT_AUTH_MAX_REQUESTS", rateLimitDefaults.auth.maxRequests),
  parseRateLimitEnv("RATE_LIMIT_AUTH_WINDOW_MS", rateLimitDefaults.auth.windowMs),
);

const respondRateLimitError = (reply: FastifyReply, remainingWindowMs: number) => {
  const retryAfter = Math.max(Math.ceil(remainingWindowMs / 1000), 1);
  reply.code(429);
  reply.header("Retry-After", String(retryAfter));
  return reply.send({
    error: "Too many requests",
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests",
  });
};

const respondCsrfError = (reply: FastifyReply) => {
  return reply.code(403).send({
    error: "Invalid CSRF token",
    code: "CSRF_TOKEN_INVALID",
    message: "Invalid CSRF token",
  });
};

const resolveCorsOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGIN || "http://localhost:5173";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

app.register(cors, {
  origin: resolveCorsOrigins(),
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "apollo-require-preflight"],
  methods: ["GET", "POST", "OPTIONS", "HEAD"],
});

app.addHook("preValidation", async (request, reply) => {
  const requestPathname = new URL(request.url, "http://localhost").pathname;
  if (request.method !== "POST" || requestPathname !== "/graphql") {
    return;
  }

  const analysis: GraphQLOperationSecurityAnalysis = analyzeGraphqlOperation(request.body);
  const isStateChanging = analysis.requiresCsrf;

  const { source, cookieToken } = normalizeAuthTokenSources(request);
  const csrfCookieToken = readCsrfSessionTokenFromCookie(request.headers.cookie);
  const csrfHeaderToken = getCsrfTokenHeader(request.headers);
  if (source === "cookie" && isStateChanging && cookieToken) {
    if (!csrfCookieToken) {
      setCsrfSessionCookie(reply);
      return respondCsrfError(reply);
    }
    if (!csrfHeaderToken || !secureStringEquals(csrfHeaderToken, csrfCookieToken)) {
      return respondCsrfError(reply);
    }
  }

  const ip = request.ip || "unknown";
  const globalRate = globalRateLimiter(ip);
  if (!globalRate.allowed) {
    return respondRateLimitError(reply, globalRate.remainingWindowMs);
  }

  if (!analysis.requiresAuthRateLimit) {
    return;
  }

  const authMutationFields = analysis.authMutationFields;
  if (authMutationFields.length === 0) {
    const conservativeAuthRate = authRateLimiter(`${ip}:__unknown_auth`);
    if (!conservativeAuthRate.allowed) {
      return respondRateLimitError(reply, conservativeAuthRate.remainingWindowMs);
    }
    return;
  }

  for (const authMutationField of authMutationFields) {
    const authRate = authRateLimiter(`${ip}:${authMutationField}`);
    if (!authRate.allowed) {
      return respondRateLimitError(reply, authRate.remainingWindowMs);
    }
  }
});

const getErrorCode = (error: unknown) => {
  if (error instanceof AppError) {
    return error.code;
  }

  const errorLike = error as { code?: unknown };
  return typeof errorLike?.code === "string" ? errorLike.code : "INTERNAL_ERROR";
};

const getErrorStatusCode = (error: unknown) => {
  const errorLike = error as { statusCode?: unknown };
  if (error instanceof AppError) {
    return error.statusCode;
  }
  if (typeof errorLike?.statusCode === "number") {
    return errorLike.statusCode;
  }
  return 500;
};

app.register(mercurius, {
  schema: typeDefs,
  resolvers,
  context: async (req, reply) => await buildContext(req, reply),
  path: "/graphql",
  graphiql: process.env.NODE_ENV !== "production",
  errorFormatter: (
    execution: { errors?: unknown[]; statusCode?: number; [key: string]: unknown },
    _context,
  ) => {
    const errorDiagnostics: Array<{
      code: string;
      statusCode: number;
      message: string;
      path?: string;
    }> = [];

    const graphQLErrors = (execution.errors ?? []).map((rawGraphQLError: unknown) => {
      const graphQLError = rawGraphQLError as {
        message?: unknown;
        path?: unknown;
        extensions?: {
          statusCode?: number;
          code?: string;
        };
        originalError?: {
          statusCode?: number;
          code?: string;
        };
      };

      const extensionLike = graphQLError.extensions ?? {};
      const extensionSource = graphQLError.originalError ?? {};
      const statusCode = extensionLike.statusCode ?? getErrorStatusCode(extensionSource);
      const code = extensionLike.code ?? getErrorCode(extensionSource);
      const message =
        typeof graphQLError.message === "string" && graphQLError.message.length > 0
          ? graphQLError.message
          : "Unknown GraphQL error";
      const normalizedMessage =
        code === "MER_ERR_GQL_PERSISTED_QUERY_NOT_FOUND" && message === "Unknown query"
          ? "No GraphQL query provided. Use /graphiql for interactive queries."
          : message;
      const path =
        Array.isArray(graphQLError.path) && graphQLError.path.length > 0
          ? graphQLError.path.join(".")
          : undefined;

      errorDiagnostics.push({
        code,
        statusCode,
        message: normalizedMessage,
        path,
      });

      return {
        ...graphQLError,
        message: normalizedMessage,
        extensions: {
          ...extensionLike,
          statusCode,
          code,
          ...(code === "MER_ERR_GQL_PERSISTED_QUERY_NOT_FOUND"
            ? {
                hint: "Open /graphiql for interactive queries or send a query in /graphql.",
              }
            : {}),
        },
      };
    });

    if (errorDiagnostics.length > 0) {
      app.log.warn({ graphqlErrors: errorDiagnostics }, "GraphQL request returned errors");
    }

    return {
      statusCode: 200,
      response: {
        ...execution,
        errors: graphQLErrors,
      },
    };
  },
});

app.addHook("onSend", async (_req, reply, payload) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  reply.header("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  reply.header("X-Content-Security-Policy", "frame-ancestors 'none'");

  if (process.env.NODE_ENV === "production") {
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return payload;
});

const startedAt = new Date().toISOString();

app.get("/health", async () => ({ status: "ok" }));
app.get("/health/live", async () => ({
  status: "ok",
  uptimeSeconds: Math.floor(process.uptime()),
  startedAt,
}));
app.get("/health/ready", async (_, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "ready",
      database: "up",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(503).send({
      status: "not_ready",
      database: "down",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt,
    });
  }
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

const port = Number(process.env.PORT || "4000");

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
