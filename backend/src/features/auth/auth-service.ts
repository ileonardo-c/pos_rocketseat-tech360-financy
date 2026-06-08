import type { GraphQLContext } from "@/context";
import type { StorageService } from "@/features/storage/storage-service";
import { getRequiredEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { AuthRepository } from "./auth-repository";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const MIN_PASSWORD_LENGTH = 8;

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  private mapUser(user: { id: string; name: string; email: string; avatarUrl: string | null }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }

  async register(name: string, email: string, password: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new AppError("Invalid name", 422, "AUTH_INVALID_NAME");
    }
    if (normalizedName.length < 2) {
      throw new AppError("Invalid name", 422, "AUTH_INVALID_NAME");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!isValidEmail) {
      throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
    }

    const normalizedPassword = password.trim();
    if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AppError("Invalid password", 422, "AUTH_INVALID_PASSWORD");
    }

    const existingUser = await this.repository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError("Email already registered", 409, "AUTH_EMAIL_ALREADY_REGISTERED");
    }

    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

    let user: Awaited<ReturnType<AuthRepository["createUser"]>>;
    try {
      user = await this.repository.createUser(normalizedName, normalizedEmail, hashedPassword);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Email already registered", 409, "AUTH_EMAIL_ALREADY_REGISTERED");
      }
      throw error;
    }
    return { created: true, user: this.mapUser(user) };
  }

  async login(email: string, password: string, rememberMe = false) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
    }
    if (!password.length) {
      throw new AppError("Invalid password", 422, "AUTH_INVALID_PASSWORD");
    }
    const normalizedPassword = password.trim();
    if (!normalizedPassword.length) {
      throw new AppError("Invalid password", 422, "AUTH_INVALID_PASSWORD");
    }
    const user = await this.repository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const validWithLegacyPassword = await bcrypt.compare(password, user.password);
    const validWithNormalizedPassword =
      normalizedPassword !== password
        ? await bcrypt.compare(normalizedPassword, user.password)
        : validWithLegacyPassword;
    const valid = validWithLegacyPassword || validWithNormalizedPassword;
    if (!valid) {
      throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"] };
    const token = jwt.sign({ sub: user.id }, getRequiredEnv("JWT_SECRET"), {
      ...signOptions,
    });

    return {
      rememberMe,
      token,
      user: this.mapUser(user),
    };
  }

  async me(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, "AUTH_UNAUTHENTICATED");
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
    }

    return this.mapUser(user);
  }

  async updateProfile(ctx: GraphQLContext, input: { name?: string | null; email?: string | null }) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, "AUTH_UNAUTHENTICATED");
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
    }

    const data: { name?: string } = {};

    if (typeof input.name === "string") {
      const normalizedName = input.name.trim();
      if (!normalizedName || normalizedName.length < 2) {
        throw new AppError("Invalid name", 422, "AUTH_INVALID_NAME");
      }
      data.name = normalizedName;
    }

    if (typeof input.email === "string") {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
      }
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      if (!isValidEmail) {
        throw new AppError("Invalid email", 422, "AUTH_INVALID_EMAIL");
      }

      if (normalizedEmail !== user.email.toLowerCase()) {
        throw new AppError("Email update is not allowed", 422, "AUTH_EMAIL_UPDATE_NOT_ALLOWED");
      }
    }

    if (!data.name) {
      throw new AppError("No profile updates provided", 422, "AUTH_INVALID_PROFILE_UPDATE");
    }

    let updated: Awaited<ReturnType<AuthRepository["updateUser"]>>;
    try {
      updated = await this.repository.updateUser(ctx.userId, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
      }
      throw error;
    }

    return this.mapUser(updated);
  }

  async updateProfileAvatar(
    ctx: GraphQLContext,
    input: { avatarKey: string },
    storageService: StorageService,
  ) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, "AUTH_UNAUTHENTICATED");
    }

    const avatarKey = input.avatarKey.trim();
    if (!avatarKey) {
      throw new AppError("Invalid avatar key", 422, "AUTH_INVALID_AVATAR_KEY");
    }

    const avatarPrefix = `users/${ctx.userId}/avatars/`;
    if (!avatarKey.startsWith(avatarPrefix)) {
      throw new AppError("Invalid avatar key", 422, "AUTH_INVALID_AVATAR_KEY");
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
    }

    const avatarUrl = storageService.publicUrlForKey(avatarKey);

    let updated: Awaited<ReturnType<AuthRepository["updateUser"]>>;
    try {
      updated = await this.repository.updateUser(ctx.userId, {
        avatarKey,
        avatarUrl,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
      }
      throw error;
    }

    await this.cleanupAvatarObject(storageService, user.avatarKey, avatarKey, ctx.userId);

    return this.mapUser(updated);
  }

  async removeProfileAvatar(ctx: GraphQLContext, storageService: StorageService) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, "AUTH_UNAUTHENTICATED");
    }

    const user = await this.repository.findById(ctx.userId);
    if (!user) {
      throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
    }

    const previousAvatarKey = user.avatarKey;

    let updated: Awaited<ReturnType<AuthRepository["updateUser"]>>;
    try {
      updated = await this.repository.updateUser(ctx.userId, {
        avatarKey: null,
        avatarUrl: null,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("User not found", 404, "AUTH_USER_NOT_FOUND");
      }
      throw error;
    }

    await this.cleanupAvatarObject(storageService, previousAvatarKey, null, ctx.userId);

    return this.mapUser(updated);
  }

  private async cleanupAvatarObject(
    storageService: StorageService,
    previousAvatarKey: string | null,
    currentAvatarKey: string | null,
    userId: string,
  ) {
    if (!previousAvatarKey || previousAvatarKey === currentAvatarKey) {
      return;
    }

    try {
      await storageService.deleteObject(previousAvatarKey);
    } catch (error) {
      console.warn("Avatar cleanup failed", {
        userId,
        key: previousAvatarKey,
        error,
      });
    }
  }
}
