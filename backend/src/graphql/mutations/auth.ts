import type { GraphQLContext } from "@/context";
import { AuthRepository } from "@/features/auth/auth-repository";
import { AuthService } from "@/features/auth/auth-service";
import { PasswordResetService } from "@/features/auth/password-reset-service";
import { StorageService } from "@/features/storage/storage-service";
import { clearAuthSessionCookie, setAuthSessionCookies } from "@/lib/auth-cookie";
import { AppError } from "@/lib/errors";
import { getStorageConfig, resolveSigningEndpointForRequest } from "@/lib/storage-env";
import { S3Client } from "@aws-sdk/client-s3";

const createS3Client = (endpointOverride?: string) => {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = getStorageConfig();

  return new S3Client({
    region,
    endpoint: endpointOverride ?? endpoint,
    forcePathStyle,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
};

export const authMutations = {
  register: async (
    _: unknown,
    args: { input: { name: string; email: string; password: string } },
    ctx: GraphQLContext,
  ) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.register(args.input.name, args.input.email, args.input.password);
  },
  login: async (
    _: unknown,
    args: {
      input: {
        email: string;
        password: string;
        rememberMe?: boolean;
      };
    },
    ctx: GraphQLContext,
  ) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    const result = await service.login(
      args.input.email,
      args.input.password,
      args.input.rememberMe,
    );
    if (ctx.reply) {
      setAuthSessionCookies(ctx.reply, result.token, args.input.rememberMe);
    }
    return result;
  },
  updateProfile: async (
    _: unknown,
    args: { input: { name?: string | null; email?: string | null } },
    ctx: GraphQLContext,
  ) => {
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.updateProfile(ctx, args.input);
  },
  requestProfileAvatarUploadUrl: async (
    _: unknown,
    args: {
      input: {
        fileName: string;
        contentType: string;
        sizeBytes: number;
      };
    },
    ctx: GraphQLContext,
  ) => {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401, "AUTH_UNAUTHENTICATED");
    }

    const signingEndpoint = resolveSigningEndpointForRequest({
      config: getStorageConfig(),
      requestOrigin: ctx.requestOrigin,
      requestHost: ctx.requestHost,
    });
    const s3Client = createS3Client(signingEndpoint);
    const storageService = new StorageService(s3Client);
    return storageService.requestProfileAvatarUploadUrl(ctx.userId, args.input);
  },
  updateProfileAvatar: async (
    _: unknown,
    args: { input: { avatarKey: string } },
    ctx: GraphQLContext,
  ) => {
    const s3Client = createS3Client();
    const storageService = new StorageService(s3Client);
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.updateProfileAvatar(ctx, args.input, storageService);
  },
  removeProfileAvatar: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const s3Client = createS3Client();
    const storageService = new StorageService(s3Client);
    const service = new AuthService(new AuthRepository(ctx.prisma));
    return service.removeProfileAvatar(ctx, storageService);
  },
  requestPasswordReset: async (
    _: unknown,
    args: { input: { email: string } },
    ctx: GraphQLContext,
  ) => {
    const service = new PasswordResetService(ctx.prisma, new AuthRepository(ctx.prisma));
    const requestContext = {
      email: args.input.email,
      requestedIp: ctx.requestedIp ?? null,
      userAgent: ctx.userAgent ?? null,
    };
    await service.request(requestContext);
    return true;
  },
  resetPassword: async (
    _: unknown,
    args: { input: { email: string; code: string; newPassword: string } },
    ctx: GraphQLContext,
  ) => {
    const service = new PasswordResetService(ctx.prisma, new AuthRepository(ctx.prisma));
    await service.reset(args.input);
    return true;
  },
  logout: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    if (ctx.reply) {
      clearAuthSessionCookie(ctx.reply);
    }
    return true;
  },
};
