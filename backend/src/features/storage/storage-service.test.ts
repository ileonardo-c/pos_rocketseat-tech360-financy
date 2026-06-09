import { AppError } from "@/lib/errors";
import { DeleteObjectCommand, HeadObjectCommand, type PutObjectCommand } from "@aws-sdk/client-s3";
import { StorageService } from "./storage-service";

process.env.AWS_S3_ENDPOINT_INTERNAL = "http://localhost:9000";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_S3_BUCKET = "financy";
process.env.AWS_ACCESS_KEY_ID = "dev";
process.env.AWS_SECRET_ACCESS_KEY = "dev";
process.env.AWS_S3_FORCE_PATH_STYLE = "true";
process.env.AWS_S3_URL_EXPIRES_IN = "900";

type StoredObject = {
  contentLength: number;
  contentType: string;
};

type S3Command = HeadObjectCommand | DeleteObjectCommand | PutObjectCommand;

class S3ClientFake {
  objects = new Map<string, StoredObject>();
  deletedKeys: string[] = [];
  deleteError: unknown = null;

  async send(command: S3Command) {
    if (command instanceof HeadObjectCommand) {
      const key = String(command.input.Key ?? "");
      const object = this.objects.get(key);
      if (!object) {
        throw new Error("Object not found");
      }

      return {
        ContentLength: object.contentLength,
        ContentType: object.contentType,
      };
    }

    if (command instanceof DeleteObjectCommand) {
      const key = String(command.input.Key ?? "");
      this.deletedKeys.push(key);
      if (this.deleteError) {
        throw this.deleteError;
      }
      this.objects.delete(key);
      return {};
    }

    return {};
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const createService = (s3Client: S3ClientFake) =>
  new StorageService(s3Client as unknown as ConstructorParameters<typeof StorageService>[0]);

const withMutedWarn = async (callback: () => Promise<void>) => {
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    await callback();
  } finally {
    console.warn = originalWarn;
  }

  return warnings;
};

const expectAppError = async (
  callback: () => Promise<unknown>,
  expectedCode: string,
  message: string,
) => {
  try {
    await callback();
  } catch (error) {
    assert(error instanceof AppError, message);
    assert(error.code === expectedCode, `Expected ${expectedCode}, got ${error.code}`);
    return;
  }

  throw new Error(message);
};

const tests: Array<[string, () => Promise<void>]> = [
  [
    "accepts valid avatar object metadata",
    async () => {
      const s3Client = new S3ClientFake();
      s3Client.objects.set("users/user-1/avatars/avatar.png", {
        contentLength: 1024,
        contentType: "image/png",
      });
      const service = createService(s3Client);

      await service.validateProfileAvatarUpload("users/user-1/avatars/avatar.png");

      assert(s3Client.deletedKeys.length === 0, "Valid avatar must not be deleted");
    },
  ],
  [
    "rejects and deletes oversized avatar object",
    async () => {
      const s3Client = new S3ClientFake();
      s3Client.objects.set("users/user-1/avatars/avatar.png", {
        contentLength: 5 * 1024 * 1024 + 1,
        contentType: "image/png",
      });
      const service = createService(s3Client);

      await expectAppError(
        () => service.validateProfileAvatarUpload("users/user-1/avatars/avatar.png"),
        "AUTH_INVALID_AVATAR_SIZE",
        "Expected oversized avatar to fail",
      );

      assert(
        s3Client.deletedKeys[0] === "users/user-1/avatars/avatar.png",
        "Oversized avatar must be deleted",
      );
    },
  ],
  [
    "rejects and deletes receipt with invalid content type",
    async () => {
      const s3Client = new S3ClientFake();
      s3Client.objects.set("users/user-1/receipts/receipt.html", {
        contentLength: 1024,
        contentType: "text/html",
      });
      const service = createService(s3Client);

      await expectAppError(
        () => service.validateReceiptUpload("users/user-1/receipts/receipt.html"),
        "UPLOAD_INVALID_CONTENT_TYPE",
        "Expected invalid receipt content type to fail",
      );

      assert(
        s3Client.deletedKeys[0] === "users/user-1/receipts/receipt.html",
        "Invalid receipt must be deleted",
      );
    },
  ],
  [
    "keeps rejection when invalid upload cleanup fails",
    async () => {
      const s3Client = new S3ClientFake();
      s3Client.deleteError = new Error("S3 delete failed");
      s3Client.objects.set("users/user-1/receipts/receipt.pdf", {
        contentLength: 10 * 1024 * 1024 + 1,
        contentType: "application/pdf",
      });
      const service = createService(s3Client);

      const warnings = await withMutedWarn(async () => {
        await expectAppError(
          () => service.validateReceiptUpload("users/user-1/receipts/receipt.pdf"),
          "UPLOAD_INVALID_SIZE",
          "Expected oversized receipt to fail",
        );
      });

      assert(warnings.length === 1, "Cleanup failure should be logged once");
      assert(warnings[0]?.[0] === "Invalid upload cleanup failed", "Warning must be in English");
    },
  ],
];

const run = async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`storage-service: ${name}`);
  }

  console.log("storage-service: all scenarios passed");
};

run().catch((error) => {
  console.error(`storage-service failed: ${error.message}`);
  process.exit(1);
});
