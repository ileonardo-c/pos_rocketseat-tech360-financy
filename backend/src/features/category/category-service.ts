import type { GraphQLContext } from "../../context";
import { AppError } from "../../lib/errors";
import { CategoryRepository } from "./category-repository";

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
      throw new AppError("Nome da categoria eh obrigatorio", 400);
    }

    return this.repository.create(ctx.userId, normalizedName);
  }

  async update(ctx: GraphQLContext, id: string, name?: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      throw new AppError("Categoria nao encontrada", 404);
    }

    if (name === undefined) {
      return category;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new AppError("Nome da categoria eh obrigatorio", 400);
    }

    return this.repository.update(id, normalizedName);
  }

  async delete(ctx: GraphQLContext, id: string) {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const category = await this.repository.findByIdAndUser(id, ctx.userId);
    if (!category) {
      return false;
    }

    await this.repository.deleteById(id);
    return true;
  }
}
