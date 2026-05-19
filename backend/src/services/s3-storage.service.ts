import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export interface UploadUrlInput {
  filename: string;
  contentType: string;
}

export interface UploadUrlOutput {
  url: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

function encodeS3KeyForUrl(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class S3StorageService {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private forcePathStyle = false;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("Configuração S3 incompleta");
    }

    this.endpoint = endpoint;
    this.bucket = bucket;
    this.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: this.forcePathStyle,
    });
  }

  async createUploadUrl(ownerId: string, input: UploadUrlInput): Promise<UploadUrlOutput> {
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${ownerId}/${Date.now()}-${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const baseEndpoint = this.endpoint.replace(/\/$/, "");
    const encodedKey = encodeS3KeyForUrl(key);
    const publicUrl = `${baseEndpoint}/${this.bucket}/${encodedKey}`;

    return {
      url,
      key,
      publicUrl,
      expiresIn: 300,
    };
  }
}

