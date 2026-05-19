import { AuthRepository } from "../../features/auth/auth-repository";
import { AuthService } from "../../features/auth/auth-service";

export const authQueries = {
  me: async (_: unknown, __: unknown, ctx: any) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.me(ctx);
  },
};
