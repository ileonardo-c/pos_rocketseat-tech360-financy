import type { GraphQLContext } from "../../context";
import { CategoryRepository } from "../../features/category/category-repository";
import { CategoryService } from "../../features/category/category-service";

const service = (ctx: GraphQLContext) => new CategoryService(new CategoryRepository(ctx.prisma));

export const categoryMutations = {
  createCategory: async (_: unknown, args: { input: { name: string } }, ctx: GraphQLContext) => {
    return service(ctx).create(ctx, args.input.name);
  },

  updateCategory: async (
    _: unknown,
    args: { id: string; input: { name?: string } },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).update(ctx, args.id, args.input.name);
  },

  deleteCategory: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    return service(ctx).delete(ctx, args.id);
  },
};
