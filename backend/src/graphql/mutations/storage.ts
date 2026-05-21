import { S3Client } from "@aws-sdk/client-s3";

import type { GraphQLContext } from "../../context";
import { StorageService } from "../../features/storage/storage-service";
import { AppError } from "../../lib/errors";

const createS3Client = () => {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

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
