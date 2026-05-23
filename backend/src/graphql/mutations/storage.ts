import { S3Client } from "@aws-sdk/client-s3";

import type { GraphQLContext } from "../../context";
import { StorageService } from "../../features/storage/storage-service";
import { AppError } from "../../lib/errors";
import { getStorageConfig } from "../../lib/storage-env";

const createS3Client = () => {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = getStorageConfig();

  return new S3Client({
    region,
    endpoint,
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
      };
    },
    ctx: GraphQLContext,
  ) => {
    if (!ctx.userId) {
      throw new AppError("Unauthenticated", 401);
    }

    const s3Client = createS3Client();
    const service = new StorageService(s3Client);
    return service.requestUploadUrl(ctx.userId, {
      fileName: args.input.fileName,
      contentType: args.input.contentType,
    });
  },
};
