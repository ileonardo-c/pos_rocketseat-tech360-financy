import { TransactionRepository } from "../../features/transaction/transaction-repository";
import { TransactionService } from "../../features/transaction/transaction-service";
import type { GraphQLContext } from "../../context";

const service = (ctx: GraphQLContext) =>
  new TransactionService(new TransactionRepository(ctx.prisma));

export const transactionQueries = {
  transactions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    return service(ctx).listByUser(ctx);
  },
};
