import type { GraphQLContext } from "@/context";
import { TransactionRepository } from "@/features/transaction/transaction-repository";
import { TransactionService } from "@/features/transaction/transaction-service";

const service = (ctx: GraphQLContext) =>
  new TransactionService(new TransactionRepository(ctx.prisma));

export const transactionQueries = {
  transactions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    return service(ctx).listByUser(ctx);
  },
  transactionSummary: async (
    _: unknown,
    args: {
      filter?: {
        from?: string | null;
        to?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).summaryByUser(ctx, args.filter);
  },
  transactionCategorySummary: async (
    _: unknown,
    args: {
      filter?: {
        from?: string | null;
        to?: string | null;
      };
      limit?: number | null;
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).summaryByCategory(ctx, args.filter, args.limit);
  },
  transactionTimeline: async (
    _: unknown,
    args: {
      filter?: {
        from?: string | null;
        to?: string | null;
      };
      interval?: "DAY" | "MONTH" | null;
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).timelineByUser(ctx, args.filter, args.interval);
  },
};
