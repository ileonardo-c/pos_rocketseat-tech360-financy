import { Prisma } from "@prisma/client";
import type { GraphQLContext } from "@/context";
import { AppError } from "@/lib/errors";
import type { CategoryRepository } from "./category-repository";

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async listByUser(ctx: GraphQLContext) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    return this.repository.findAllByUser(ctx.userId);
  }

  async create(ctx: GraphQLContext, name: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new AppError("Category name is required", 400);
    }

    try {
      return await this.repository.create(ctx.userId, normalizedName);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Category name already exists", 409);
      }
      throw error;
    }
  }

  async update(ctx: GraphQLContext, id: string, name?: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (name === undefined) {
      return category;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new AppError("Category name is required", 400);
    }

    try {
      return await this.repository.update(id, normalizedName);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Category name already exists", 409);
      }
      throw error;
    }
  }

  async delete(ctx: GraphQLContext, id: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      return false;
    }

    try {
      await this.repository.deleteById(id);
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError("Category has linked transactions", 409);
      }
      throw error;
    }
  }
}

