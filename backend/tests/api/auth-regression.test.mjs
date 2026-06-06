import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  const envExample = await readFile(new URL("../../../.env.example", import.meta.url), "utf8");
  const databaseUrlLine = envExample
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("DATABASE_URL="));
  const databaseUrl = databaseUrlLine
    ?.slice("DATABASE_URL=".length)
    .trim()
    .replace("@localhost:", "@127.0.0.1:");
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }
}

const graphqlUrl = process.env.GRAPHQL_URL ?? "http://127.0.0.1:4000/graphql";
const textEncoder = new TextEncoder();
const resetCodePepper = process.env.RESET_CODE_PEPPER ?? "financy-reset-pepper";
const prisma = new PrismaClient();

const toBase64Url = (value) => Buffer.from(value).toString("base64url");

const signHs256Token = async ({ payload, secret }) => {
  const header = { alg: "HS256", typ: "JWT" };
  const headerPart = toBase64Url(JSON.stringify(header));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${headerPart}.${payloadPart}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    textEncoder.encode(unsignedToken),
  );
  const signaturePart = Buffer.from(signatureBuffer).toString("base64url");

  return `${unsignedToken}.${signaturePart}`;
};

const request = async (query, token, variables = {}, extraHeaders = {}) => {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie().join("\n")
      : (response.headers.get("set-cookie") ?? "");
  return {
    httpStatus: response.status,
    setCookie,
    data: payload.data,
    code: payload.code ?? "",
    message: payload.message ?? "",
    errors: payload.errors ?? [],
  };
};

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const ensureHasErrorMessage = (errors, expected) => {
  const raw = errors.map((error) => `${error?.message ?? ""}`.toLowerCase()).join(" ");
  ensure(raw.includes(expected), `Expected error message to include "${expected}", got: ${raw}`);
};

const getFirstErrorExtensionCode = (errors) => {
  const first = errors?.[0];
  if (!first || typeof first !== "object") {
    return "";
  }

  return `${first?.extensions?.code ?? ""}`.toLowerCase();
};

const ensureHasErrorCode = (errors, expected) => {
  const code = getFirstErrorExtensionCode(errors);
  ensure(code === expected.toLowerCase(), `Expected error code "${expected}", got "${code}"`);
};

const ensureHasResponseCode = (result, expected) => {
  const code = `${result.code ?? ""}`.toLowerCase();
  ensure(code === expected.toLowerCase(), `Expected response code "${expected}", got "${code}"`);
};

const ensureHasErrorStatus = (errors, expectedStatus) => {
  const rawStatus = `${errors?.[0]?.extensions?.statusCode ?? ""}`.toLowerCase() ?? "";
  ensure(
    String(rawStatus) === String(expectedStatus),
    `Expected error statusCode "${expectedStatus}", got "${rawStatus}"`,
  );
};

const ensureStatus = (status, allowed, context) => {
  const normalized = Array.isArray(allowed) ? allowed : [allowed];
  ensure(
    normalized.includes(status),
    `${context} expected status ${normalized.join(" or ")}, got ${status}`,
  );
};

const buildRandomInput = () => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return {
    name: `Smoke User ${randomSuffix}`,
    email: `smoke-${randomSuffix}@financy.local`,
    password: "SmokePass123!",
  };
};

const registerMutation = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      created
      user { id email }
    }
  }
`;

const loginMutation = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id email }
    }
  }
`;

const requestPasswordResetMutation = `
  mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
    requestPasswordReset(input: $input)
  }
`;

const resetPasswordMutation = `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;

const meQuery = `
  query Me {
    me { id email }
  }
`;

const categoriesListQuery = `
  query CategoriesList($page: Int, $perPage: Int) {
    categoriesList(page: $page, perPage: $perPage) {
      id
      name
      description
      icon
      color
      transactionsCount
      userId
    }
  }
`;

const categoriesCountQuery = `
  query CategoriesCount {
    categoriesCount
  }
`;

const categoriesOverviewQuery = `
  query CategoriesOverview {
    categoriesOverview {
      totalCategories
      totalTransactions
      mostUsedCategory {
        id
        name
        icon
        color
        count
      }
    }
  }
`;

const createCategoryMutation = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;

const createCategoryWithMisleadingOperationNameMutation = `
  mutation Login($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;

const hashResetCode = (code) => {
  return createHmac("sha256", resetCodePepper).update(code).digest("hex");
};

const createPasswordResetCode = async ({ userId, email, code, createdAt }) => {
  return prisma.passwordResetCode.create({
    data: {
      userId,
      email,
      codeHash: hashResetCode(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      maxAttempts: 5,
      requestedIp: "127.0.0.1",
      userAgent: "auth-regression",
      createdAt,
    },
  });
};

const run = async () => {
  const user = buildRandomInput();
  const meResultWithoutToken = await request(meQuery, undefined, {});
  ensureStatus(meResultWithoutToken.httpStatus, [200, 401], "Me query without token");
  ensure(
    meResultWithoutToken.errors.length > 0,
    "Me query without token must return GraphQL error",
  );
  ensureHasErrorMessage(meResultWithoutToken.errors, "unauthenticated");

  const invalidTokenResult = await request(meQuery, "invalid.token.here", {});
  ensureStatus(invalidTokenResult.httpStatus, [200, 401], "Me query with invalid token");
  ensure(
    invalidTokenResult.errors.length > 0,
    "Me query with invalid token must return GraphQL error",
  );
  ensureHasErrorMessage(invalidTokenResult.errors, "unauthenticated");

  const categoriesWithoutToken = await request(categoriesListQuery, undefined, {
    page: 1,
    perPage: 8,
  });
  ensureStatus(
    categoriesWithoutToken.httpStatus,
    [200, 401],
    "Categories list query without token",
  );
  ensure(
    categoriesWithoutToken.errors.length > 0,
    "Categories list query without token must return GraphQL error",
  );
  ensureHasErrorCode(categoriesWithoutToken.errors, "CATEGORY_UNAUTHENTICATED");
  ensureHasErrorStatus(categoriesWithoutToken.errors, 401);

  const registerData = await request(registerMutation, undefined, { input: user });
  ensure(registerData.httpStatus === 200, "Register request should return HTTP 200");
  ensure(
    registerData.errors.length === 0,
    `Register should not return errors: ${JSON.stringify(registerData.errors)}`,
  );
  ensure(registerData.data.register.created === true, "Register response should include created");
  const userId = registerData.data.register.user?.id;
  ensure(!!userId, "Register response should include user id");
  ensure(
    registerData.data.register.user?.email.toLowerCase() === user.email.toLowerCase(),
    "Register response should store normalized email",
  );

  const duplicateEmailResult = await request(registerMutation, undefined, { input: user });
  ensureStatus(duplicateEmailResult.httpStatus, [200, 409], "Duplicate register request");
  ensure(duplicateEmailResult.errors.length > 0, "Duplicate register must return error");
  ensureHasErrorMessage(duplicateEmailResult.errors, "already");
  ensureHasErrorCode(duplicateEmailResult.errors, "AUTH_EMAIL_ALREADY_REGISTERED");

  const duplicateEmailWithWhitespaceResult = await request(registerMutation, undefined, {
    input: {
      name: `${user.name} Duplicate`,
      email: `  ${user.email.toUpperCase()}  `,
      password: "AnotherPassword123!",
    },
  });
  ensureStatus(
    duplicateEmailWithWhitespaceResult.httpStatus,
    [200, 409],
    "Duplicate register with normalized email input",
  );
  ensure(
    duplicateEmailWithWhitespaceResult.errors.length > 0,
    "Duplicate register with normalized email should return error",
  );
  ensureHasErrorMessage(duplicateEmailWithWhitespaceResult.errors, "already");
  ensureHasErrorCode(duplicateEmailWithWhitespaceResult.errors, "AUTH_EMAIL_ALREADY_REGISTERED");
  ensure(!duplicateEmailWithWhitespaceResult.data, "Duplicate registration must not return data");

  const duplicateWithDifferentPassword = await request(registerMutation, undefined, {
    input: {
      name: `${user.name} Duplicate`,
      email: user.email,
      password: "AnotherPassword123!",
    },
  });
  ensureStatus(duplicateWithDifferentPassword.httpStatus, [200, 409], "Duplicate register request");
  ensure(
    duplicateWithDifferentPassword.errors.length > 0,
    "Duplicate register with different password must return error",
  );
  ensureHasErrorCode(duplicateWithDifferentPassword.errors, "AUTH_EMAIL_ALREADY_REGISTERED");
  ensure(!duplicateWithDifferentPassword.data, "Duplicate registration must not return data");

  const resetRequest = await request(requestPasswordResetMutation, undefined, {
    input: { email: user.email },
  });
  ensure(resetRequest.httpStatus === 200, "Password reset request should return HTTP 200");
  ensure(
    resetRequest.errors.length === 0,
    `Password reset request should not return errors: ${JSON.stringify(resetRequest.errors)}`,
  );
  ensure(
    resetRequest.data?.requestPasswordReset === true,
    "Password reset request should return generic success",
  );

  const repeatedResetRequest = await request(requestPasswordResetMutation, undefined, {
    input: { email: user.email },
  });
  ensure(
    repeatedResetRequest.httpStatus === 200,
    "Repeated password reset request should return HTTP 200",
  );
  ensure(
    repeatedResetRequest.errors.length === 0,
    `Repeated password reset request should not reveal cooldown: ${JSON.stringify(repeatedResetRequest.errors)}`,
  );
  ensure(
    repeatedResetRequest.data?.requestPasswordReset === true,
    "Repeated password reset request should return generic success",
  );

  const missingResetRequest = await request(requestPasswordResetMutation, undefined, {
    input: { email: `missing-reset-${user.email}` },
  });
  ensure(
    missingResetRequest.httpStatus === 200,
    "Missing user password reset request should return HTTP 200",
  );
  ensure(
    missingResetRequest.errors.length === 0,
    `Missing user password reset request should not return errors: ${JSON.stringify(missingResetRequest.errors)}`,
  );
  ensure(
    missingResetRequest.data?.requestPasswordReset === true,
    "Missing user password reset request should return generic success",
  );

  await prisma.passwordResetCode.deleteMany({ where: { userId } });
  const olderResetCode = "111111";
  const newerResetCode = "222222";
  await createPasswordResetCode({
    userId,
    email: user.email,
    code: olderResetCode,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  });
  await createPasswordResetCode({
    userId,
    email: user.email,
    code: newerResetCode,
    createdAt: new Date(Date.now() - 60 * 1000),
  });

  const firstResetPassword = "ResetPass123!";
  const secondResetPassword = "SecondReset123!";
  const resetPasswordResult = await request(resetPasswordMutation, undefined, {
    input: {
      email: user.email,
      code: newerResetCode,
      newPassword: firstResetPassword,
    },
  });
  ensure(resetPasswordResult.httpStatus === 200, "Password reset should return HTTP 200");
  ensure(
    resetPasswordResult.errors.length === 0,
    `Password reset should not return errors: ${JSON.stringify(resetPasswordResult.errors)}`,
  );
  ensure(resetPasswordResult.data?.resetPassword === true, "Password reset should return success");

  const activeResetCodesAfterReset = await prisma.passwordResetCode.count({
    where: {
      userId,
      email: user.email,
      usedAt: null,
      expiresAt: {
        gte: new Date(),
      },
    },
  });
  ensure(activeResetCodesAfterReset === 0, "Password reset must invalidate all active codes");

  const staleResetPasswordResult = await request(resetPasswordMutation, undefined, {
    input: {
      email: user.email,
      code: olderResetCode,
      newPassword: secondResetPassword,
    },
  });
  ensureStatus(staleResetPasswordResult.httpStatus, [200, 422], "Stale reset code reuse");
  ensure(staleResetPasswordResult.errors.length > 0, "Stale reset code must return error");
  ensureHasErrorCode(staleResetPasswordResult.errors, "PASSWORD_RESET_CODE_INVALID");

  const firstResetLogin = await request(loginMutation, undefined, {
    input: { email: user.email, password: firstResetPassword },
  });
  ensure(firstResetLogin.httpStatus === 200, "Reset credentials should authenticate");
  ensure(
    firstResetLogin.errors.length === 0,
    `Reset credentials authentication failed: ${JSON.stringify(firstResetLogin.errors)}`,
  );
  ensure(firstResetLogin.data?.login?.token, "Reset credentials login should include token");

  const secondResetLogin = await request(loginMutation, undefined, {
    input: { email: user.email, password: secondResetPassword },
  });
  ensureStatus(secondResetLogin.httpStatus, [200, 401], "Rejected stale reset credentials");
  ensure(secondResetLogin.errors.length > 0, "Rejected stale reset credentials must return error");
  ensureHasErrorMessage(secondResetLogin.errors, "invalid credentials");

  const confirmOriginalLogin = await request(loginMutation, undefined, {
    input: { email: user.email, password: user.password },
  });
  ensureStatus(confirmOriginalLogin.httpStatus, [200, 401], "Original credentials after reset");
  ensure(
    confirmOriginalLogin.errors.length > 0,
    "Original credentials must stop authenticating after password reset",
  );
  ensureHasErrorMessage(confirmOriginalLogin.errors, "invalid credentials");

  const invalidRegister = await request(registerMutation, undefined, {
    input: { name: "a", email: "invalid-email", password: "123" },
  });
  ensureStatus(invalidRegister.httpStatus, [200, 422], "Register with invalid input");
  ensure(invalidRegister.errors.length > 0, "Register with invalid input must return error");
  ensureHasErrorMessage(invalidRegister.errors, "invalid");
  ensureHasErrorCode(invalidRegister.errors, "AUTH_INVALID_NAME");
  ensureHasErrorStatus(invalidRegister.errors, 422);

  const missingUser = await request(loginMutation, undefined, {
    input: { email: `notfound-${user.email}`, password: user.password },
  });
  ensureStatus(missingUser.httpStatus, [200, 401], "Login with nonexistent user");
  ensure(missingUser.errors.length > 0, "Login with nonexistent user must return error");
  ensureHasErrorMessage(missingUser.errors, "invalid credentials");

  const legacyPassword = "123456";
  const legacyEmail = `legacy-${user.email}`;
  await prisma.user.create({
    data: {
      name: "Legacy Password User",
      email: legacyEmail,
      password: await bcrypt.hash(legacyPassword, 10),
    },
  });
  const legacyLogin = await request(loginMutation, undefined, {
    input: { email: legacyEmail, password: legacyPassword },
  });
  ensure(legacyLogin.httpStatus === 200, "Legacy short password login should return HTTP 200");
  ensure(
    legacyLogin.errors.length === 0,
    `Legacy short password login should not return errors: ${JSON.stringify(legacyLogin.errors)}`,
  );
  ensure(legacyLogin.data?.login?.token, "Legacy short password login should include token");

  const wrongPassword = await request(loginMutation, undefined, {
    input: { email: user.email, password: "wrong-password" },
  });
  ensureStatus(wrongPassword.httpStatus, [200, 401], "Login with wrong password");
  ensure(wrongPassword.errors.length > 0, "Login with wrong password must return error");
  ensureHasErrorMessage(wrongPassword.errors, "invalid credentials");
  ensureHasErrorStatus(wrongPassword.errors, 401);

  const emptyPassword = await request(loginMutation, undefined, {
    input: { email: user.email, password: "" },
  });
  ensureStatus(emptyPassword.httpStatus, [200, 422], "Login with empty password");
  ensure(emptyPassword.errors.length > 0, "Login with empty password must return error");
  ensureHasErrorMessage(emptyPassword.errors, "invalid password");
  ensureHasErrorCode(emptyPassword.errors, "AUTH_INVALID_PASSWORD");
  ensureHasErrorStatus(emptyPassword.errors, 422);

  const legacySessionCsrfBootstrap = await request(
    createCategoryMutation,
    undefined,
    {
      input: {
        name: "Legacy session requires CSRF",
        description: "Missing CSRF cookie should bootstrap a new token.",
        icon: "utensils",
        color: "blue",
      },
    },
    {
      cookie: `financy_session=${firstResetLogin.data.login.token}; Path=/`,
    },
  );
  ensureStatus(
    legacySessionCsrfBootstrap.httpStatus,
    [200, 403],
    "Legacy cookie session without CSRF must be blocked",
  );
  ensureHasResponseCode(legacySessionCsrfBootstrap, "CSRF_TOKEN_INVALID");
  ensure(
    legacySessionCsrfBootstrap.setCookie.includes("financy_csrf="),
    "Legacy cookie session without CSRF must receive a CSRF cookie",
  );

  const csrfBypassedMutation = await request(
    createCategoryMutation,
    undefined,
    {
      input: {
        name: "Tentativa bloqueada de CSRF",
        description: "Sem token CSRF.",
        icon: "utensils",
        color: "blue",
      },
    },
    {
      cookie: "financy_session=invalid.token; Path=/",
    },
  );
  ensureStatus(
    csrfBypassedMutation.httpStatus,
    [200, 403],
    "Mutation with cookie session must enforce CSRF",
  );
  ensure(
    csrfBypassedMutation.errors.length > 0 || csrfBypassedMutation.code === "CSRF_TOKEN_INVALID",
    "Mutation with missing CSRF token should return an error",
  );
  if (csrfBypassedMutation.errors.length > 0) {
    ensureHasErrorCode(csrfBypassedMutation.errors, "CSRF_TOKEN_INVALID");
  } else {
    ensureHasResponseCode(csrfBypassedMutation, "CSRF_TOKEN_INVALID");
  }

  const csrfMisleadingOperationNameMutation = await request(
    createCategoryWithMisleadingOperationNameMutation,
    undefined,
    {
      input: {
        name: "Misleading operation blocked by CSRF",
        description: "Operation name must not bypass CSRF.",
        icon: "utensils",
        color: "blue",
      },
    },
    {
      cookie: "financy_session=invalid.token; Path=/",
    },
  );
  ensureStatus(
    csrfMisleadingOperationNameMutation.httpStatus,
    [200, 403],
    "Misleading operation name mutation with cookie session must enforce CSRF",
  );
  ensure(
    csrfMisleadingOperationNameMutation.errors.length > 0 ||
      csrfMisleadingOperationNameMutation.code === "CSRF_TOKEN_INVALID",
    "Misleading operation name mutation should return a CSRF error",
  );
  if (csrfMisleadingOperationNameMutation.errors.length > 0) {
    ensureHasErrorCode(csrfMisleadingOperationNameMutation.errors, "CSRF_TOKEN_INVALID");
  } else {
    ensureHasResponseCode(csrfMisleadingOperationNameMutation, "CSRF_TOKEN_INVALID");
  }

  const loginData = await request(loginMutation, undefined, {
    input: { email: user.email, password: firstResetPassword },
  });
  ensure(loginData.httpStatus === 200, "Login request should return HTTP 200");
  ensure(
    loginData.errors.length === 0,
    `Login should not return errors: ${JSON.stringify(loginData.errors)}`,
  );
  ensure(loginData.data?.login?.token, "Login response should include token");
  ensure(loginData.data.login.token.length > 0, "Login response should return a non-empty token");

  const meWithNewToken = await request(meQuery, loginData.data.login.token, {});
  ensure(meWithNewToken.httpStatus === 200, "Me query with valid token should return HTTP 200");
  ensure(
    meWithNewToken.errors.length === 0,
    `Me query with valid token must not error: ${JSON.stringify(meWithNewToken.errors)}`,
  );
  ensure(meWithNewToken.data?.me?.id === userId, "Me query should return the same user");

  const categoriesListEmpty = await request(categoriesListQuery, loginData.data.login.token, {
    page: 1,
    perPage: 8,
  });
  ensure(
    categoriesListEmpty.errors.length === 0,
    `Categories list with empty database must not error: ${JSON.stringify(categoriesListEmpty.errors)}`,
  );
  ensure(
    Array.isArray(categoriesListEmpty.data?.categoriesList),
    "Categories list should return an array",
  );
  ensure(
    categoriesListEmpty.data.categoriesList.length === 0,
    "Categories list should be empty when user has no categories",
  );

  const categoriesCountEmpty = await request(categoriesCountQuery, loginData.data.login.token, {});
  ensure(
    categoriesCountEmpty.errors.length === 0,
    `Categories count with empty database must not error: ${JSON.stringify(categoriesCountEmpty.errors)}`,
  );
  ensure(
    categoriesCountEmpty.data?.categoriesCount === 0,
    `Categories count should be 0 for a new user, got ${categoriesCountEmpty.data?.categoriesCount}`,
  );

  const categoriesOverviewEmpty = await request(
    categoriesOverviewQuery,
    loginData.data.login.token,
    {},
  );
  ensure(
    categoriesOverviewEmpty.errors.length === 0,
    `Categories overview with empty database must not error: ${JSON.stringify(categoriesOverviewEmpty.errors)}`,
  );
  ensure(
    categoriesOverviewEmpty.data?.categoriesOverview?.totalCategories === 0,
    `Categories overview totalCategories should be 0, got ${categoriesOverviewEmpty.data?.categoriesOverview?.totalCategories}`,
  );
  ensure(
    categoriesOverviewEmpty.data?.categoriesOverview?.totalTransactions === 0,
    `Categories overview totalTransactions should be 0, got ${categoriesOverviewEmpty.data?.categoriesOverview?.totalTransactions}`,
  );
  ensure(
    categoriesOverviewEmpty.data?.categoriesOverview?.mostUsedCategory === null,
    "Categories overview mostUsedCategory should be null when there are no transactions",
  );

  const jwtSecret = process.env.AUTH_SCRIPT_JWT_SECRET;
  if (jwtSecret) {
    const issuedAt = Math.floor(Date.now() / 1000) - 10;
    const expiredAt = issuedAt - 1;
    const expiredToken = await signHs256Token({
      payload: { sub: userId, iat: issuedAt, exp: expiredAt },
      secret: jwtSecret,
    });
    const expiredTokenResult = await request(meQuery, expiredToken, {});
    ensureStatus(expiredTokenResult.httpStatus, [200, 401], "Me query with expired token");
    ensure(expiredTokenResult.errors.length > 0, "Me query with expired token must return error");
    const expiredErrors = expiredTokenResult.errors
      .map((error) => `${error?.message ?? ""}`.toLowerCase())
      .join(" ");
    ensure(
      expiredErrors.includes("expired") || expiredErrors.includes("unauthenticated"),
      `Expected expired token to be rejected, got: ${expiredErrors}`,
    );
  } else {
    console.warn(
      "auth-regression: AUTH_SCRIPT_JWT_SECRET not set, skipping token expired scenario",
    );
  }

  console.log("auth-regression: all scenarios passed");
};

run()
  .catch((error) => {
    console.error(`auth-regression failed: ${error.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
