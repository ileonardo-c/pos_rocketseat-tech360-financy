export type StorageConfig = {
  endpoint?: string;
  region: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  urlExpiresIn: number;
};

export const getStorageConfig = (): StorageConfig => {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim() || "us-east-1";
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  const urlExpiresIn = Number(process.env.S3_URL_EXPIRES_IN || "900");

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    urlExpiresIn,
  };
};
