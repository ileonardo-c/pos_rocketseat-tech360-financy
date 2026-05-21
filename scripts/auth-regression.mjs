const graphqlUrl = process.env.GRAPHQL_URL ?? "http://127.0.0.1:4000/graphql";

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
    let jwt = null;
    try {
      const module = await import("backend/node_modules/jsonwebtoken");
      jwt = module.default ?? module;
    } catch (_error) {
      console.warn(
        "auth-regression: skipped expired-token scenario; backend node_modules/jsonwebtoken unavailable",
      );
    }

    if (jwt) {
      const expiredToken = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "-1s" });
      const expiredTokenResult = await request(meQuery, expiredToken, {});
      ensureStatus(expiredTokenResult.httpStatus, [200, 401], "Me query with expired token");
      ensure(expiredTokenResult.errors.length > 0, "Me query with expired token must return error");
      ensureHasErrorMessage(expiredTokenResult.errors, "expired");
    }
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
