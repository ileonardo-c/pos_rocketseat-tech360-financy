import { assertProductionSecurityConfig } from "../../dist/lib/env.js";

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const withTemporaryEnv = (updates, callback) => {
  const previous = new Map();
  for (const [name, value] of Object.entries(updates)) {
    previous.set(name, process.env[name]);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  try {
    callback();
  } finally {
    for (const [name, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
};

const ensureThrowsWithMessage = (callback, expected) => {
  try {
    callback();
  } catch (error) {
    const message = `${error?.message ?? ""}`;
    ensure(
      message.includes(expected),
      `Expected thrown error to include "${expected}", got: ${message}`,
    );
    return;
  }

  throw new Error(`Expected callback to throw "${expected}"`);
};

withTemporaryEnv(
  {
    NODE_ENV: "production",
    JWT_SECRET: "production_jwt_secret_with_more_than_32_chars",
    RESET_CODE_PEPPER: "production_reset_pepper_with_more_than_32_chars",
    AWS_SECRET_ACCESS_KEY: "production-aws-secret",
    POSTGRES_PASSWORD: undefined,
    MINIO_ROOT_PASSWORD: undefined,
  },
  () => {
    assertProductionSecurityConfig();
  },
);

withTemporaryEnv(
  {
    NODE_ENV: "production",
    JWT_SECRET: "change_me",
    RESET_CODE_PEPPER: "production_reset_pepper_with_more_than_32_chars",
    AWS_SECRET_ACCESS_KEY: "production-aws-secret",
  },
  () => {
    ensureThrowsWithMessage(
      assertProductionSecurityConfig,
      "Unsafe production environment variable value: JWT_SECRET",
    );
  },
);

withTemporaryEnv(
  {
    NODE_ENV: "production",
    JWT_SECRET: "production_jwt_secret_with_more_than_32_chars",
    RESET_CODE_PEPPER: "production_reset_pepper_with_more_than_32_chars",
    AWS_SECRET_ACCESS_KEY: "minioadmin123",
  },
  () => {
    ensureThrowsWithMessage(
      assertProductionSecurityConfig,
      "Unsafe production environment variable value: AWS_SECRET_ACCESS_KEY",
    );
  },
);

console.log("env-production: all scenarios passed");
