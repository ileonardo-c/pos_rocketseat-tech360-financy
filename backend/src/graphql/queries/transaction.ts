import type { GraphQLContext } from "@/context";
import { TransactionRepository } from "@/features/transaction/transaction-repository";
import { TransactionService } from "@/features/transaction/transaction-service";

const service = (ctx: GraphQLContext) =>
  new TransactionService(new TransactionRepository(ctx.prisma));

export const transactionQueries = {
  transactionsInitialPeriod: async (_: unknown, _args: unknown, ctx: GraphQLContext) => {
    return service(ctx).initialPeriodByUser(ctx);
  },
  transactions: async (
    _: unknown,
    args: {
      filter?: {
        query?: string | null;
        type?: string | null;
        categoryId?: string | null;
        from?: string | null;
        to?: string | null;
      };
      sort?: {
        field?: "DATE" | "AMOUNT" | "TITLE" | null;
        direction?: "ASC" | "DESC" | null;
      } | null;
      page?: number | null;
      perPage?: number | null;
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).listByUser(ctx, args.filter, args.sort, args.page, args.perPage);
  },
  transactionsCount: async (
    _: unknown,
    args: {
      filter?: {
        query?: string | null;
        type?: string | null;
        categoryId?: string | null;
        from?: string | null;
        to?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).countByUser(ctx, args.filter);
  },
  dashboardRecentTransactions: async (
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
    return service(ctx).recentByUser(ctx, args.filter, args.limit);
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
