import { CategoryRepository } from "../../features/category/category-repository";
import { CategoryService } from "../../features/category/category-service";

export const categoryQueries = {
  categories: async (_: unknown, __: unknown, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new CategoryService(new CategoryRepository(ctx.prisma));
    return service.list(ctx.userId);
  },
};
