import type { GraphQLContext } from "@/context";
import { CategoryRepository } from "@/features/category/category-repository";
import { CategoryService } from "@/features/category/category-service";

const service = (ctx: GraphQLContext) => new CategoryService(new CategoryRepository(ctx.prisma));

export const categoryMutations = {
  createCategory: async (
    _: unknown,
    args: {
      input: {
        name: string;
        description?: string | null;
        icon?: string | null;
        color?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).create(ctx, args.input);
  },

  updateCategory: async (
    _: unknown,
    args: {
      id: string;
      input: {
        name?: string | null;
        description?: string | null;
        icon?: string | null;
        color?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).update(ctx, args.id, args.input);
  },

  deleteCategory: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    return service(ctx).delete(ctx, args.id);
  },
};
