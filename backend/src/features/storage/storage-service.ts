import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AppError } from "@/lib/errors";
import { getStorageConfig } from "@/lib/storage-env";

type UploadInput = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

type ProfileAvatarUploadInput = UploadInput & {
  sizeBytes: number;
};

type RequestUploadUrlResult = {
  url: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
};

type UploadValidationConfig = {
  allowedContentTypes: Set<string>;
  maxSizeBytes: number;
  invalidContentTypeCode: string;
  invalidSizeCode: string;
  invalidKeyCode: string;
};

const ALLOWED_AVATAR_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export class StorageService {
  private readonly s3: S3Client;
  private readonly endpoint: string;
  private readonly publicEndpoint: string;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor(s3Client: S3Client) {
    this.s3 = s3Client;
    const { endpoint, publicEndpoint, bucket, urlExpiresIn } = getStorageConfig();
    this.endpoint = endpoint || "";
    this.publicEndpoint = publicEndpoint || endpoint || "";
    this.bucket = bucket || "";
    this.expiresIn = urlExpiresIn;
  }

  async requestUploadUrl(userId: string, input: UploadInput): Promise<RequestUploadUrlResult> {
    this.ensureStorageConfigured();

    const fileName = input.fileName.trim();
    if (!fileName) {
      throw new AppError("Invalid file name", 400);
    }

    const contentType = input.contentType.trim().toLowerCase();
    if (!ALLOWED_RECEIPT_CONTENT_TYPES.has(contentType)) {
      throw new AppError("Invalid receipt content type", 422, "UPLOAD_INVALID_CONTENT_TYPE");
    }

    if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new AppError("Invalid receipt size", 422, "UPLOAD_INVALID_SIZE");
    }

    if (input.sizeBytes > RECEIPT_MAX_SIZE_BYTES) {
      throw new AppError("Invalid receipt size", 422, "UPLOAD_INVALID_SIZE");
    }

    const key = this.buildReceiptObjectKey(userId, fileName);
    return this.generateUploadPayload(key, contentType);
  }

  async requestProfileAvatarUploadUrl(
    userId: string,
    input: ProfileAvatarUploadInput,
  ): Promise<RequestUploadUrlResult> {
    this.ensureStorageConfigured();

    const fileName = input.fileName.trim();
    if (!fileName) {
      throw new AppError("Invalid file name", 422, "AUTH_INVALID_AVATAR_FILE_NAME");
    }

    const contentType = input.contentType.trim().toLowerCase();
    if (!ALLOWED_AVATAR_CONTENT_TYPES.has(contentType)) {
      throw new AppError("Invalid avatar content type", 422, "AUTH_INVALID_AVATAR_CONTENT_TYPE");
    }

    if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new AppError("Invalid avatar size", 422, "AUTH_INVALID_AVATAR_SIZE");
    }

    if (input.sizeBytes > AVATAR_MAX_SIZE_BYTES) {
      throw new AppError("Invalid avatar size", 422, "AUTH_INVALID_AVATAR_SIZE");
    }

    const key = this.buildAvatarObjectKey(userId, fileName);
    return this.generateUploadPayload(key, contentType);
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.bucket) {
      throw new AppError("Missing S3 bucket configuration", 500);
    }

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      }),
    );
  }

  async validateProfileAvatarUpload(key: string): Promise<void> {
    await this.validateUploadedObject(key, {
      allowedContentTypes: ALLOWED_AVATAR_CONTENT_TYPES,
      maxSizeBytes: AVATAR_MAX_SIZE_BYTES,
      invalidContentTypeCode: "AUTH_INVALID_AVATAR_CONTENT_TYPE",
      invalidSizeCode: "AUTH_INVALID_AVATAR_SIZE",
      invalidKeyCode: "AUTH_INVALID_AVATAR_KEY",
    });
  }

  async validateReceiptUpload(key: string): Promise<void> {
    await this.validateUploadedObject(key, {
      allowedContentTypes: ALLOWED_RECEIPT_CONTENT_TYPES,
      maxSizeBytes: RECEIPT_MAX_SIZE_BYTES,
      invalidContentTypeCode: "UPLOAD_INVALID_CONTENT_TYPE",
      invalidSizeCode: "UPLOAD_INVALID_SIZE",
      invalidKeyCode: "UPLOAD_INVALID_KEY",
    });
  }

  publicUrlForKey(key: string): string {
    this.ensureStorageConfigured();

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      throw new AppError("Invalid object key", 422, "AUTH_INVALID_AVATAR_KEY");
    }

    return `${this.publicEndpoint.replace(/\/$/, "")}/${this.bucket}/${normalizedKey}`;
  }

  private ensureStorageConfigured() {
    if (!this.endpoint) {
      throw new AppError("Missing S3 configuration", 500);
    }
    if (!this.bucket) {
      throw new AppError("Missing S3 bucket configuration", 500);
    }
  }

  private async generateUploadPayload(
    key: string,
    contentType: string,
  ): Promise<RequestUploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
    });

    return {
      url,
      key,
      publicUrl: this.publicUrlForKey(key),
      expiresIn: this.expiresIn,
    };
  }

  private async validateUploadedObject(key: string, config: UploadValidationConfig): Promise<void> {
    this.ensureStorageConfigured();

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      throw new AppError("Invalid object key", 422, config.invalidKeyCode);
    }

    let metadata: HeadObjectCommandOutput;
    try {
      metadata = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
        }),
      );
    } catch {
      throw new AppError("Uploaded object not found", 422, config.invalidKeyCode);
    }

    const contentLength = metadata.ContentLength;
    if (
      !Number.isFinite(contentLength) ||
      typeof contentLength !== "number" ||
      contentLength <= 0 ||
      contentLength > config.maxSizeBytes
    ) {
      await this.deleteInvalidUpload(normalizedKey);
      throw new AppError("Invalid uploaded object size", 422, config.invalidSizeCode);
    }

    const contentType = metadata.ContentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!config.allowedContentTypes.has(contentType)) {
      await this.deleteInvalidUpload(normalizedKey);
      throw new AppError(
        "Invalid uploaded object content type",
        422,
        config.invalidContentTypeCode,
      );
    }
  }

  private async deleteInvalidUpload(key: string): Promise<void> {
    try {
      await this.deleteObject(key);
    } catch (error) {
      console.warn("Invalid upload cleanup failed", {
        key,
        error,
      });
    }
  }

  private buildAvatarObjectKey(userId: string, fileName: string) {
    const suffix = this.getFileSuffix(fileName);
    const safeUuid = randomUUID().replace(/-/g, "").slice(0, 16);

    return `users/${userId}/avatars/${Date.now()}-${safeUuid}${suffix}`;
  }

  private buildReceiptObjectKey(userId: string, fileName: string) {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const base = sanitizedName.includes(".")
      ? sanitizedName.substring(0, sanitizedName.lastIndexOf("."))
      : sanitizedName;

    const keyBase = base.length > 0 ? base : "upload";
    const suffix = this.getFileSuffix(fileName);
    const safeUuid = randomUUID().replace(/-/g, "").slice(0, 16);

    return `users/${userId}/receipts/${Date.now()}-${safeUuid}-${keyBase}${suffix}`;
  }

  private getFileSuffix(fileName: string) {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const extension = sanitizedName.includes(".") ? sanitizedName.split(".").pop() : "";
    return extension ? `.${extension}` : "";
  }
}
