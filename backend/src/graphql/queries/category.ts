import type { GraphQLContext } from "@/context";
import { CategoryRepository } from "@/features/category/category-repository";
import { CategoryService } from "@/features/category/category-service";

const service = (ctx: GraphQLContext) => new CategoryService(new CategoryRepository(ctx.prisma));

export const categoryQueries = {
  categories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    return service(ctx).listByUser(ctx);
  },
};

