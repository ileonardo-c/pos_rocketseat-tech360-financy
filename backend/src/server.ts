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

app.register(mercurius, {
  schema: typeDefs,
  resolvers,
  context: async (req) => ({ ...(await buildContext(req)), prisma }),
  path: "/graphql",
  graphiql: true,
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

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  const fallbackStatusCode =
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;
  const statusCode = error instanceof AppError ? error.statusCode : fallbackStatusCode;
  const message = error instanceof AppError ? error.message : "Internal server error";
  return reply.status(statusCode).send({ message });
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

const port = Number(process.env.PORT || "4000");

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
