export type StorageConfig = {
  endpoint: string;
  publicEndpoint?: string;
  publicOriginHosts: string[];
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  urlExpiresIn: number;
};

type ResolveSigningEndpointInput = {
  config: StorageConfig;
  requestOrigin?: string | null;
  requestHost?: string | null;
};

const normalizeHost = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("[")) {
    const closingIndex = normalized.indexOf("]");
    if (closingIndex > 0) {
      return normalized.slice(1, closingIndex);
    }
  }

  const [hostname] = normalized.split(":");
  return hostname ?? "";
};

const parsePublicOriginHosts = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  const unique = new Set<string>();
  for (const host of value.split(",")) {
    const normalized = normalizeHost(host);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
};

const extractOriginHost = (origin: string | null | undefined) => {
  if (!origin) {
    return "";
  }

  try {
    return normalizeHost(new URL(origin).host);
  } catch {
    return "";
  }
};

const extractRequestHost = (requestHost: string | null | undefined) => {
  if (!requestHost) {
    return "";
  }

  return normalizeHost(requestHost);
};

const parseBooleanEnv = (value: string, name: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new Error(`Invalid boolean value for environment variable: ${name}`);
};

const parsePositiveIntEnv = (value: string, name: string) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric value for environment variable: ${name}`);
  }
  return parsed;
};

export const getStorageConfig = (): StorageConfig => {
  const endpoint = process.env.AWS_S3_ENDPOINT_INTERNAL?.trim() || "";
  if (!endpoint) {
    throw new Error("Missing required environment variable: AWS_S3_ENDPOINT_INTERNAL");
  }

  const publicEndpoint = process.env.AWS_S3_ENDPOINT_PUBLIC?.trim() || undefined;
  const publicOriginHosts = parsePublicOriginHosts(process.env.S3_PUBLIC_ORIGIN_HOSTS);
  const region = process.env.AWS_REGION?.trim() || "";
  if (!region) {
    throw new Error("Missing required environment variable: AWS_REGION");
  }

  const bucket = process.env.AWS_S3_BUCKET?.trim() || "";
  if (!bucket) {
    throw new Error("Missing required environment variable: AWS_S3_BUCKET");
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() || "";
  if (!accessKeyId) {
    throw new Error("Missing required environment variable: AWS_ACCESS_KEY_ID");
  }

  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() || "";
  if (!secretAccessKey) {
    throw new Error("Missing required environment variable: AWS_SECRET_ACCESS_KEY");
  }

  const forcePathStyleRaw = process.env.AWS_S3_FORCE_PATH_STYLE?.trim() || "";
  if (!forcePathStyleRaw) {
    throw new Error("Missing required environment variable: AWS_S3_FORCE_PATH_STYLE");
  }
  const forcePathStyle = parseBooleanEnv(forcePathStyleRaw, "AWS_S3_FORCE_PATH_STYLE");

  const urlExpiresInRaw = process.env.AWS_S3_URL_EXPIRES_IN?.trim() || "";
  if (!urlExpiresInRaw) {
    throw new Error("Missing required environment variable: AWS_S3_URL_EXPIRES_IN");
  }
  const urlExpiresIn = parsePositiveIntEnv(urlExpiresInRaw, "AWS_S3_URL_EXPIRES_IN");

  if (publicOriginHosts.length > 0 && !publicEndpoint) {
    throw new Error(
      "Missing required environment variable: AWS_S3_ENDPOINT_PUBLIC when S3_PUBLIC_ORIGIN_HOSTS is configured",
    );
  }

  return {
    endpoint,
    publicEndpoint,
    publicOriginHosts,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    urlExpiresIn,
  };
};

export const resolveSigningEndpointForRequest = (input: ResolveSigningEndpointInput): string => {
  const {
    config: { endpoint, publicEndpoint, publicOriginHosts },
    requestOrigin,
    requestHost,
  } = input;

  if (!publicEndpoint || publicOriginHosts.length === 0) {
    return endpoint;
  }

  const clientHost = extractOriginHost(requestOrigin) || extractRequestHost(requestHost);
  if (!clientHost) {
    return endpoint;
  }

  if (publicOriginHosts.includes(clientHost)) {
    return publicEndpoint;
  }

  return endpoint;
};
