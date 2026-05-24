import cors from "@fastify/cors";
import Fastify from "fastify";
import mercurius from "mercurius";
import { buildContext } from "./context";
import { resolvers, typeDefs } from "./graphql/index";
import { getRequiredEnv } from "./lib/env";
import { AppError } from "./lib/errors";
import { prisma } from "./prisma/client";

getRequiredEnv("DATABASE_URL");
getRequiredEnv("JWT_SECRET");

const app = Fastify({ logger: true });

app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
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
  context: async (req) => await buildContext(req),
  path: "/graphql",
  graphiql: true,
  errorFormatter: (
    execution: { errors?: unknown[]; statusCode?: number; [key: string]: unknown },
    _context,
  ) => {
    const graphQLErrors = (execution.errors ?? []).map((rawGraphQLError: unknown) => {
      const graphQLError = rawGraphQLError as {
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

      return {
        ...graphQLError,
        extensions: {
          ...extensionLike,
          statusCode: extensionLike.statusCode ?? getErrorStatusCode(extensionSource),
          code: extensionLike.code ?? getErrorCode(extensionSource),
        },
      };
    });

    return {
      statusCode: 200,
      response: {
        ...execution,
        errors: graphQLErrors,
      },
    };
  },
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
