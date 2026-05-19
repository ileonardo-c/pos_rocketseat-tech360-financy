import { S3StorageService } from "../../services/s3-storage.service";

export class UploadService {
  private readonly s3 = new S3StorageService();

  createUploadUrl(userId: string, filename: string, contentType: string) {
    return this.s3.createUploadUrl(userId, { filename, contentType });
  }
}
