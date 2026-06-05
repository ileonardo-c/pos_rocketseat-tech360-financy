export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const getOptionalEnv = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value || undefined;
};

const weakProductionEnvValues: Record<string, Set<string>> = {
  JWT_SECRET: new Set(["change_me", "changeme", "dev_secret", "secret"]),
  POSTGRES_PASSWORD: new Set(["financy_password", "postgres", "password"]),
  AWS_SECRET_ACCESS_KEY: new Set(["minioadmin123"]),
  RESET_CODE_PEPPER: new Set(["financy-reset-pepper", "change_me", "changeme"]),
  MINIO_ROOT_PASSWORD: new Set(["minioadmin123"]),
};

export function assertProductionSecurityConfig(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  for (const [name, weakValues] of Object.entries(weakProductionEnvValues)) {
    const value = getRequiredEnv(name);
    if (weakValues.has(value)) {
      throw new Error(`Unsafe production environment variable value: ${name}`);
    }
  }

  if (getRequiredEnv("JWT_SECRET").length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  if (getRequiredEnv("RESET_CODE_PEPPER").length < 32) {
    throw new Error("RESET_CODE_PEPPER must be at least 32 characters in production");
  }
}
