import { CategoryRepository } from "../../features/category/category-repository";
import { CategoryService } from "../../features/category/category-service";
import type { GraphQLContext } from "../../context";

const service = (ctx: GraphQLContext) => new CategoryService(new CategoryRepository(ctx.prisma));

export const categoryQueries = {
  categories: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    return service(ctx).listByUser(ctx);
  },
};
