import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { GraphQLContext } from "../../context";
import { getRequiredEnv } from "../../lib/env";
import { AppError } from "../../lib/errors";
import type { AuthRepository } from "./auth-repository";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.repository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError("Email ja cadastrado", 409);
    }

    const hashed = await bcrypt.hash(password, 10);
    let user;
    try {
      user = await this.repository.createUser(name, normalizedEmail, hashed);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("Email ja cadastrado", 409);
      }
      throw error;
    }
    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, getRequiredEnv("JWT_SECRET"), {
      ...signOptions,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError("Credenciais invalidas", 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError("Credenciais invalidas", 401);
    }

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, getRequiredEnv("JWT_SECRET"), {
      ...signOptions,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async me(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Nao autenticado", 401);
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    return { id: user.id, name: user.name, email: user.email };
  }
}
