import { randomUUID } from "node:crypto";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AppError } from "@/lib/errors";
import { getStorageConfig } from "@/lib/storage-env";

type UploadInput = {
  fileName: string;
  contentType: string;
};

type RequestUploadUrlResult = {
  url: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
};

export class StorageService {
  private readonly s3: S3Client;
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor(s3Client: S3Client) {
    this.s3 = s3Client;
    const { endpoint, bucket, urlExpiresIn } = getStorageConfig();
    this.endpoint = endpoint || "";
    this.bucket = bucket || "";
    this.expiresIn = urlExpiresIn;
  }

  async requestUploadUrl(userId: string, input: UploadInput): Promise<RequestUploadUrlResult> {
    if (!this.endpoint) {
      throw new AppError("Missing S3 configuration", 500);
    }
    if (!this.bucket) {
      throw new AppError("Missing S3 bucket configuration", 500);
    }

    const fileName = input.fileName.trim();
    if (!fileName) {
      throw new AppError("Invalid file name", 400);
    }

    const key = this.buildObjectKey(userId, fileName);
    const contentType = input.contentType.trim() || "application/octet-stream";
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
      publicUrl: `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`,
      expiresIn: this.expiresIn,
    };
  }

  private buildObjectKey(userId: string, fileName: string) {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const extension = sanitizedName.includes(".") ? sanitizedName.split(".").pop() : "";
    const base = sanitizedName.includes(".")
      ? sanitizedName.substring(0, sanitizedName.lastIndexOf("."))
      : sanitizedName;

    const keyBase = base.length > 0 ? base : "upload";
    const suffix = extension ? `.${extension}` : "";
    const safeUuid = randomUUID().replace(/-/g, "").slice(0, 16);

    return `users/${userId}/${Date.now()}-${safeUuid}-${keyBase}${suffix}`;
  }
}
