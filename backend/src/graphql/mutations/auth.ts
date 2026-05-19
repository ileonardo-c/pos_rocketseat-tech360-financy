import { AuthRepository } from "../../features/auth/auth-repository";
import { AuthService } from "../../features/auth/auth-service";

export const authMutations = {
  register: async (_: unknown, args: { input: { name: string; email: string; password: string } }, ctx: any) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.register(args.input.name, args.input.email, args.input.password);
  },
  login: async (_: unknown, args: { input: { email: string; password: string } }, ctx: any) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.login(args.input.email, args.input.password);
  },
};
