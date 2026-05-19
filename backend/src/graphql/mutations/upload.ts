import { UploadService } from "../../features/upload/upload-service";

export const uploadMutations = {
  requestUploadUrl: async (_: unknown, args: { input: { filename: string; contentType: string } }, ctx: any) => {
    if (!ctx.userId) {
      throw new Error("Não autenticado");
    }

    const service = new UploadService();
    return service.createUploadUrl(ctx.userId, args.input.filename, args.input.contentType);
  },
};
