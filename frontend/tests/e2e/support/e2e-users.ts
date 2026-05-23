import { createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";

export const buildTransientE2EUser = () => {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const password = "E2E_UserPass123!";

  return {
    name: `E2E User ${suffix}`,
    updatedName: `E2E User Updated ${suffix}`,
    email: `e2e.${suffix}@financy.local`,
    password,
    categoryName: `Categoria E2E ${suffix}`,
    transactionTitle: `Transação E2E ${suffix}`,
  };
};

export const buildExpiredToken = () => {
  const secret = process.env.JWT_SECRET ?? "changeme";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "e2e-user",
      exp: Math.floor(Date.now() / 1000) - 3600,
    }),
  ).toString("base64url");

  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");

  return `${data}.${signature}`;
};

