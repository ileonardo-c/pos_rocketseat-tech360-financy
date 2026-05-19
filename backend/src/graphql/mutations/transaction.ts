import { TransactionRepository } from "../../features/transaction/transaction-repository";
import { TransactionService } from "../../features/transaction/transaction-service";

export const transactionMutations = {
  createTransaction: async (
    _: unknown,
    args: {
      input: {
        title: string;
        amount: number;
        type: "INCOME" | "EXPENSE";
        description?: string;
        categoryId: string;
        date?: string;
      };
    },
    ctx: any,
  ) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new TransactionService(new TransactionRepository(ctx.prisma));
    return service.create(ctx.userId, {
      title: args.input.title,
      amount: args.input.amount,
      type: args.input.type as "INCOME" | "EXPENSE",
      description: args.input.description,
      categoryId: args.input.categoryId,
      date: args.input.date,
    });
  },

  updateTransaction: async (
    _: unknown,
    args: {
      id: string;
      input: {
        title?: string;
        amount?: number;
        type?: "INCOME" | "EXPENSE";
        description?: string;
        categoryId?: string;
        date?: string;
      };
    },
    ctx: any,
  ) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new TransactionService(new TransactionRepository(ctx.prisma));
    return service.update(ctx.userId, args.id, {
      ...args.input,
      type: args.input.type as "INCOME" | "EXPENSE" | undefined,
    });
  },

  deleteTransaction: async (_: unknown, args: { id: string }, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new TransactionService(new TransactionRepository(ctx.prisma));
    return service.remove(ctx.userId, args.id);
  },
};
