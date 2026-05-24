const graphqlUrl = process.env.GRAPHQL_URL ?? "http://127.0.0.1:4000/graphql";
const textEncoder = new TextEncoder();

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

const request = async (query, token, variables = {}) => {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  return {
    httpStatus: response.status,
    data: payload.data,
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
      token
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

const meQuery = `
  query Me {
    me { id email }
  }
`;

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

  const registerData = await request(registerMutation, undefined, { input: user });
  ensure(registerData.httpStatus === 200, "Register request should return HTTP 200");
  ensure(
    registerData.errors.length === 0,
    `Register should not return errors: ${JSON.stringify(registerData.errors)}`,
  );
  ensure(registerData.data?.register?.token, "Register response should include token");
  const { token } = registerData.data.register;
  const userId = registerData.data.register.user?.id;
  ensure(!!userId, "Register response should include user id");

  const duplicateEmailResult = await request(registerMutation, undefined, { input: user });
  ensureStatus(duplicateEmailResult.httpStatus, [200, 409], "Duplicate register request");
  ensure(duplicateEmailResult.errors.length > 0, "Duplicate register must return error");
  ensureHasErrorMessage(duplicateEmailResult.errors, "already");
  ensureHasErrorCode(duplicateEmailResult.errors, "AUTH_EMAIL_ALREADY_REGISTERED");

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

  const loginData = await request(loginMutation, undefined, {
    input: { email: user.email, password: user.password },
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

run().catch((error) => {
  console.error(`auth-regression failed: ${error.message}`);
  process.exit(1);
});
