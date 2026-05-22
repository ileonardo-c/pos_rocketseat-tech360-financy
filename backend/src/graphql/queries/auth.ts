import type { GraphQLContext } from "../../context";
import { AuthRepository } from "../../features/auth/auth-repository";
import { AuthService } from "../../features/auth/auth-service";

export const authQueries = {
  me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.me(ctx);
  },
};
