import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma/client";

export interface GraphQLContext {
  prisma: typeof prisma;
  userId?: string;
}

interface TokenPayload {
  sub?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function buildContext(req: FastifyRequest): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return { prisma };
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return { prisma, userId: payload.sub };
  } catch {
    return { prisma };
  }
}
