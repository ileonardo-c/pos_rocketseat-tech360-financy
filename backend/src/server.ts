import Fastify from "fastify";
import cors from "@fastify/cors";
import mercurius from "mercurius";
import { buildContext } from "./context";
import { typeDefs, resolvers } from "./graphql/index";
import { prisma } from "./prisma/client";

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

app.get("/health", async () => ({ status: "ok" }));

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  return reply.status(400).send({ message: error.message ?? "Erro interno" });
});

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

const port = Number(process.env.PORT || "4000");

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
