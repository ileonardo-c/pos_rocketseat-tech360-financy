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
  return {
    httpStatus: response.status,
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

  const confirmOriginalLogin = await request(loginMutation, undefined, {
    input: { email: user.email, password: user.password },
  });
  ensure(confirmOriginalLogin.httpStatus === 200, "Original credentials must still authenticate");
  ensure(
    confirmOriginalLogin.errors.length === 0,
    `Original credentials authentication failed after duplicate attempt: ${JSON.stringify(confirmOriginalLogin.errors)}`,
  );
  ensure(confirmOriginalLogin.data?.login?.token, "Login response should include token");

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

run().catch((error) => {
  console.error(`auth-regression failed: ${error.message}`);
  process.exit(1);
});
