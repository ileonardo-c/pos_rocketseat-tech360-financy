import { TransactionService } from "../../features/transaction/transaction-service";
import { TransactionRepository } from "../../features/transaction/transaction-repository";

export const transactionQueries = {
  transactions: async (_: unknown, __: unknown, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new TransactionService(new TransactionRepository(ctx.prisma));
    return service.list(ctx.userId);
  },
};
