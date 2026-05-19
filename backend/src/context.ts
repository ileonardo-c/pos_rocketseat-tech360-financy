import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { getRequiredEnv } from "./lib/env";
import { prisma } from "./prisma/client";

export interface GraphQLContext {
  prisma: typeof prisma;
  userId?: string;
}

interface TokenPayload {
  sub?: string;
}

export async function buildContext(req: FastifyRequest): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return { prisma };
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const jwtSecret = getRequiredEnv("JWT_SECRET");
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    return { prisma, userId: payload.sub };
  } catch {
    return { prisma };
  }
}
