import { S3Client } from "@aws-sdk/client-s3";

import type { GraphQLContext } from "@/context";
import { StorageService } from "@/features/storage/storage-service";
import { AppError } from "@/lib/errors";
import { getStorageConfig, resolveSigningEndpointForRequest } from "@/lib/storage-env";

const createS3Client = (endpointOverride?: string) => {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = getStorageConfig();

  return new S3Client({
    region,
    endpoint: endpointOverride ?? endpoint,
    forcePathStyle,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
};

export const storageMutations = {
  requestUploadUrl: async (
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
      throw new AppError("Unauthenticated", 401);
    }

    const signingEndpoint = resolveSigningEndpointForRequest({
      config: getStorageConfig(),
      requestOrigin: ctx.requestOrigin,
      requestHost: ctx.requestHost,
    });
    const s3Client = createS3Client(signingEndpoint);
    const service = new StorageService(s3Client);
    return service.requestUploadUrl(ctx.userId, {
      fileName: args.input.fileName,
      contentType: args.input.contentType,
      sizeBytes: args.input.sizeBytes,
    });
  },
};
