import { CategoryRepository } from "../../features/category/category-repository";
import { CategoryService } from "../../features/category/category-service";

export const categoryMutations = {
  createCategory: async (_: unknown, args: { input: { name: string } }, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new CategoryService(new CategoryRepository(ctx.prisma));
    return service.create(ctx.userId, args.input.name);
  },
  updateCategory: async (
    _: unknown,
    args: { id: string; input: { name?: string } },
    ctx: any,
  ) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new CategoryService(new CategoryRepository(ctx.prisma));
    const updated = await service.update(ctx.userId, args.id, args.input.name || "");
    return updated;
  },
  deleteCategory: async (_: unknown, args: { id: string }, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new CategoryService(new CategoryRepository(ctx.prisma));
    return service.remove(ctx.userId, args.id);
  },
};
