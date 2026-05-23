import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { GraphQLContext } from "@/context";
import { getRequiredEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { AuthRepository } from "./auth-repository";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(name: string, email: string, password: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new AppError("Invalid name", 400);
    }
    if (normalizedName.length < 2) {
      throw new AppError("Invalid name", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new AppError("Invalid email", 400);
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!isValidEmail) {
      throw new AppError("Invalid email", 400);
    }

    const normalizedPassword = password.trim();
    if (normalizedPassword.length < 6) {
      throw new AppError("Invalid password", 400);
    }

    const existingUser = await this.repository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError("Email already registered", 409);
    }

    const hashed = await bcrypt.hash(normalizedPassword, 10);
    let user: Awaited<ReturnType<AuthRepository["createUser"]>>;
    try {
      user = await this.repository.createUser(normalizedName, normalizedEmail, hashed);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already registered", 409);
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
    if (!normalizedEmail) {
      throw new AppError("Invalid email", 400);
    }
    if (!password.length) {
      throw new AppError("Invalid credentials", 401);
    }
    const normalizedPassword = password.trim();

    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const validWithLegacyPassword = await bcrypt.compare(password, user.password);
    const validWithNormalizedPassword =
      normalizedPassword !== password
        ? await bcrypt.compare(normalizedPassword, user.password)
        : validWithLegacyPassword;
    const valid = validWithLegacyPassword || validWithNormalizedPassword;
    if (!valid) {
      throw new AppError("Invalid credentials", 401);
    }

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, getRequiredEnv("JWT_SECRET"), {
      ...signOptions,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  async me(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return { id: user.id, name: user.name, email: user.email };
  }

  async updateProfile(ctx: GraphQLContext, input: { name?: string | null; email?: string | null }) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const data: { name?: string; email?: string } = {};

    if (typeof input.name === "string") {
      const normalizedName = input.name.trim();
      if (!normalizedName || normalizedName.length < 2) {
        throw new AppError("Invalid name", 400);
      }
      data.name = normalizedName;
    }

    if (typeof input.email === "string") {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new AppError("Invalid email", 400);
      }
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      if (!isValidEmail) {
        throw new AppError("Invalid email", 400);
      }

      const existingUser = await this.repository.findByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== ctx.userId) {
        throw new AppError("Email already registered", 409);
      }
      data.email = normalizedEmail;
    }

    if (!data.name && !data.email) {
      throw new AppError("No profile updates provided", 400);
    }

    let updated: Awaited<ReturnType<AuthRepository["updateUser"]>>;
    try {
      updated = await this.repository.updateUser(ctx.userId, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already registered", 409);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("User not found", 404);
      }
      throw error;
    }

    return { id: updated.id, name: updated.name, email: updated.email };
  }
}

