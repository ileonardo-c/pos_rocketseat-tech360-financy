import { TransactionRepository } from "../../features/transaction/transaction-repository";
import { TransactionService } from "../../features/transaction/transaction-service";
import type { GraphQLContext } from "../../context";

const service = (ctx: GraphQLContext) =>
  new TransactionService(new TransactionRepository(ctx.prisma));

export const transactionMutations = {
  createTransaction: async (
    _: unknown,
    args: {
      input: {
        title: string;
        description?: string | null;
        amount: number;
        type: "INCOME" | "EXPENSE";
        date: string;
        categoryId: string;
        receiptKey?: string | null;
        receiptUrl?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).create(ctx, {
      title: args.input.title,
      description: args.input.description,
      amount: args.input.amount,
      type: args.input.type,
      date: args.input.date,
      categoryId: args.input.categoryId,
      receiptKey: args.input.receiptKey,
      receiptUrl: args.input.receiptUrl,
    });
  },

  updateTransaction: async (
    _: unknown,
    args: {
      id: string;
      input: {
        title?: string;
        description?: string | null;
        amount?: number;
        type?: "INCOME" | "EXPENSE";
        date?: string;
        categoryId?: string;
        receiptKey?: string | null;
        receiptUrl?: string | null;
      };
    },
    ctx: GraphQLContext,
  ) => {
    return service(ctx).update(ctx, args.id, {
      ...args.input,
    });
  },

  deleteTransaction: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
    return service(ctx).delete(ctx, args.id);
  },
};
