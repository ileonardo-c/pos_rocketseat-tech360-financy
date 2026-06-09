import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const APP_BACKEND_URL =
  process.env.E2E_API_URL ??
  process.env.BACKEND_URL ??
  process.env.VITE_BACKEND_URL ??
  "http://localhost:4000";
const GRAPHQL_URL = APP_BACKEND_URL.endsWith("/graphql")
  ? APP_BACKEND_URL
  : `${APP_BACKEND_URL}/graphql`;

const BOOTSTRAP_USER_NAME = process.env.E2E_SEED_NAME ?? "Financy Admin";
const BOOTSTRAP_USER_EMAIL = process.env.E2E_SEED_EMAIL ?? "admin@financy.local";
const BOOTSTRAP_USER_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "TestAdmin123!";
const AVATAR_PATH = process.env.E2E_SEED_AVATAR_PATH?.trim();
const BOOTSTRAP_MAX_RETRIES = 8;
const BOOTSTRAP_SEED_DRY_RUN =
  process.env.E2E_SEED_DRY_RUN === "1" || process.env.E2E_SEED_DRY_RUN?.toLowerCase() === "true";
const BOOTSTRAP_SEED_MONTH_ONLY = (process.env.E2E_SEED_MONTH_ONLY ?? "true") !== "false";
const BOOTSTRAP_SEED_DAYS_OFFSET =
  Number.parseInt(process.env.E2E_SEED_DAYS_OFFSET ?? "0", 10) || 0;
const BOOTSTRAP_SEED_TRANSACTIONS_PER_PAGE = (() => {
  const parsed = Number.parseInt(process.env.E2E_SEED_TRANSACTIONS_PER_PAGE ?? "50", 10);
  if (Number.isNaN(parsed)) {
    return 50;
  }

  return Math.max(1, Math.min(parsed, 50));
})();
const BOOTSTRAP_AVATAR_SETUP_DISABLED =
  process.env.E2E_SKIP_AVATAR_SETUP === "1" ||
  process.env.E2E_SKIP_AVATAR_SETUP?.toLowerCase() === "true" ||
  process.env.E2E_SEED_SKIP_AVATAR_SETUP === "1" ||
  process.env.E2E_SEED_SKIP_AVATAR_SETUP?.toLowerCase() === "true";
const BOOTSTRAP_AVATAR_SETUP_RETRIES = 3;

const FALLBACK_AVATAR_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACEN9P7AAAAF0lEQVR42mNk+M9QzwAEYBxVSFQAZYAAAOQAFW9hEJYAAAAAElFTkSuQmCC";

const backendHealthCheckQuery = "query HealthCheck { __typename }";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loginMutation = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id name email avatarUrl }
    }
  }
`;

const meQuery = `
  query Me {
    me {
      id
      name
      email
      avatarUrl
    }
  }
`;

const updateProfileMutation = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`;

const requestProfileAvatarUploadUrlMutation = `
  mutation RequestProfileAvatarUploadUrl($input: ProfileAvatarUploadInput!) {
    requestProfileAvatarUploadUrl(input: $input) {
      url
      key
      publicUrl
      expiresIn
    }
  }
`;

const updateProfileAvatarMutation = `
  mutation UpdateProfileAvatar($input: UpdateProfileAvatarInput!) {
    updateProfileAvatar(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`;

const categoriesQuery = `
  query Categories {
    categories {
      id
      name
      description
      icon
      color
    }
  }
`;

const createCategoryMutation = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
    }
  }
`;

const deleteCategoryMutation = `
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

const transactionsQuery = `
  query Transactions(
    $filter: TransactionListFilterInput
    $sort: TransactionSortInput
    $page: Int
    $perPage: Int
  ) {
    transactions(
      filter: $filter
      sort: $sort
      page: $page
      perPage: $perPage
    ) {
      id
      title
      date
    }
  }
`;

const deleteTransactionMutation = `
  mutation DeleteTransaction($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

const createTransactionMutation = `
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      id
    }
  }
`;

const SEED_CATEGORIES = [
  {
    key: "salario",
    name: "Salário",
    description: "Pagamento mensal",
    icon: "briefcase-business",
    color: "green",
  },
  {
    key: "investimento",
    name: "Investimento",
    description: "Retorno e juros",
    icon: "piggy-bank",
    color: "green",
  },
  {
    key: "alimentacao",
    name: "Alimentação",
    description: "Refeições e delivery",
    icon: "utensils",
    color: "blue",
  },
  {
    key: "transporte",
    name: "Transporte",
    description: "Mobilidade e combustível",
    icon: "car-front",
    color: "purple",
  },
  {
    key: "mercado",
    name: "Mercado",
    description: "Compras essenciais",
    icon: "shopping-cart",
    color: "orange",
  },
  {
    key: "entretenimento",
    name: "Entretenimento",
    description: "Lazer e streaming",
    icon: "ticket",
    color: "pink",
  },
  {
    key: "utilidades",
    name: "Utilidades",
    description: "Contas recorrentes",
    icon: "tool-case",
    color: "yellow",
  },
];

const SEED_TRANSACTIONS = [
  {
    title: "Salário mensal",
    description: "Receita mensal",
    amount: 4500.5,
    type: "INCOME",
    categoryKey: "salario",
    day: 4,
  },
  {
    title: "Investimento",
    description: "Rendimento financeiro",
    amount: 780.25,
    type: "INCOME",
    categoryKey: "investimento",
    day: 5,
  },
  {
    title: "Supermercado",
    description: "Compras da semana",
    amount: 612.35,
    type: "EXPENSE",
    categoryKey: "mercado",
    day: 7,
  },
  {
    title: "Alimentação",
    description: "Jantar em casa",
    amount: 245.8,
    type: "EXPENSE",
    categoryKey: "alimentacao",
    day: 10,
  },
  {
    title: "Transporte",
    description: "Posto e estacionamento",
    amount: 178.9,
    type: "EXPENSE",
    categoryKey: "transporte",
    day: 12,
  },
  {
    title: "Entretenimento",
    description: "Shows e streaming",
    amount: 149.9,
    type: "EXPENSE",
    categoryKey: "entretenimento",
    day: 15,
  },
  {
    title: "Utilidades",
    description: "Internet e energia",
    amount: 320,
    type: "EXPENSE",
    categoryKey: "utilidades",
    day: 18,
  },
];

const resolveGraphQLErrorCode = (errors) => {
  const first = Array.isArray(errors) ? errors[0] : undefined;
  if (!first || typeof first !== "object") {
    return "";
  }

  return `${first?.extensions?.code ?? ""}`.toUpperCase();
};

const requestGraphQL = async (query, variables = {}, token = undefined) => {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.errors?.[0]?.message ? `: ${payload.errors[0].message}` : "";
    throw new Error(`GraphQL HTTP ${response.status}${message}`);
  }

  return {
    data: payload.data ?? null,
    errors: payload.errors ?? [],
    status: response.status,
  };
};

const resolveAvatarPath = async () => {
  if (AVATAR_PATH) {
    const absolute = path.resolve(AVATAR_PATH);
    if (existsSync(absolute)) {
      return absolute;
    }
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "financy-e2e-avatar-"));
  const fallbackPath = path.join(tmpDir, "e2e-avatar.png");
  await writeFile(fallbackPath, Buffer.from(FALLBACK_AVATAR_BASE64, "base64"));
  return fallbackPath;
};

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
};

const getSeedAnchorDate = () => {
  const now = new Date();
  const anchor = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + BOOTSTRAP_SEED_DAYS_OFFSET,
  );
  return anchor;
};

const getSeedCleanupFilter = () => {
  if (!BOOTSTRAP_SEED_MONTH_ONLY) {
    return {
      from: "2000-01-01",
      to: "2099-12-31",
    };
  }

  const anchor = getSeedAnchorDate();
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  return {
    from: toDateInput(firstDay),
    to: toDateInput(lastDay),
  };
};

const getSeedTransactionDate = (anchorDate, filter, day) => {
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
  const from = parseDateInput(filter.from);
  const to = parseDateInput(filter.to);
  const candidate = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    Math.min(Math.max(day, 1), monthEnd),
  );

  if (candidate < from) {
    return filter.from;
  }

  if (candidate > to) {
    return filter.to;
  }

  return toDateInput(candidate);
};

const waitForBackend = async () => {
  for (let attempt = 1; attempt <= BOOTSTRAP_MAX_RETRIES; attempt += 1) {
    try {
      const result = await requestGraphQL(backendHealthCheckQuery, {});
      if (result.status >= 200 && result.status < 400 && !result.errors?.length) {
        return;
      }
    } catch {
      // retry
    }

    if (attempt >= BOOTSTRAP_MAX_RETRIES) {
      throw new Error(`GraphQL endpoint unavailable after ${BOOTSTRAP_MAX_RETRIES} attempts`);
    }

    await sleep(1000 * attempt);
  }
};

const listSeedTransactions = async (token) => {
  const filter = getSeedCleanupFilter();
  const response = await requestGraphQL(
    transactionsQuery,
    {
      filter,
      sort: {
        field: "DATE",
        direction: "DESC",
      },
      page: 1,
      perPage: BOOTSTRAP_SEED_TRANSACTIONS_PER_PAGE,
    },
    token,
  );

  if (response.errors.length > 0) {
    throw new Error(
      `Could not list seed transactions: ${response.errors[0]?.message ?? "unknown"}`,
    );
  }

  return response.data?.transactions ?? [];
};

const cleanSeedTransactions = async (token) => {
  while (true) {
    const items = await listSeedTransactions(token);
    if (!items.length) {
      return;
    }

    for (const item of items) {
      const deleteResponse = await requestGraphQL(
        deleteTransactionMutation,
        {
          id: item.id,
        },
        token,
      );

      if (deleteResponse.errors.length > 0) {
        throw new Error(
          `Could not delete transaction ${item?.id}: ${deleteResponse.errors[0]?.message ?? "unknown"}`,
        );
      }
    }

    if (items.length < BOOTSTRAP_SEED_TRANSACTIONS_PER_PAGE) {
      return;
    }
  }
};

const listSeedCategories = async (token) => {
  const response = await requestGraphQL(categoriesQuery, {}, token);
  if (response.errors.length > 0) {
    throw new Error(`Could not list seed categories: ${response.errors[0]?.message ?? "unknown"}`);
  }
  return response.data?.categories ?? [];
};

const cleanSeedCategories = async (token) => {
  const categories = await listSeedCategories(token);
  for (const category of categories) {
    const deleteResponse = await requestGraphQL(
      deleteCategoryMutation,
      {
        id: category.id,
      },
      token,
    );

    if (deleteResponse.errors.length > 0) {
      const code = resolveGraphQLErrorCode(deleteResponse.errors);
      if (code === "CATEGORY_HAS_LINKED_TRANSACTIONS") {
        continue;
      }
      if (code === "CATEGORY_NOT_FOUND") {
        continue;
      }
      throw new Error(
        `Could not delete category ${category.id}: ${deleteResponse.errors[0]?.message ?? "unknown"}`,
      );
    }
  }
};

const seedCategories = async (token) => {
  const createdByKey = new Map();

  for (const category of SEED_CATEGORIES) {
    const response = await requestGraphQL(
      createCategoryMutation,
      {
        input: {
          name: category.name,
          description: category.description,
          icon: category.icon,
          color: category.color,
        },
      },
      token,
    );

    if (response.errors.length > 0) {
      const code = resolveGraphQLErrorCode(response.errors);
      if (code === "CATEGORY_ALREADY_EXISTS") {
        const existingCategories = await listSeedCategories(token);
        const existingCategory = existingCategories.find(
          (item) => `${item?.name ?? ""}`.trim().toLowerCase() === category.name.toLowerCase(),
        );

        if (existingCategory?.id) {
          createdByKey.set(category.key, {
            id: existingCategory.id,
            name: existingCategory.name,
          });
          continue;
        }
      }

      throw new Error(
        `Could not create category ${category.name}: ${response.errors[0]?.message ?? code}`,
      );
    }

    const created = response.data?.createCategory;
    if (!created?.id) {
      throw new Error(`Could not create category ${category.name}: empty payload`);
    }
    createdByKey.set(category.key, created);
  }

  return createdByKey;
};

const seedTransactions = async (token, createdByKey) => {
  const filter = getSeedCleanupFilter();
  const anchorDate = getSeedAnchorDate();

  for (const seed of SEED_TRANSACTIONS) {
    const category = createdByKey.get(seed.categoryKey);
    if (!category?.id) {
      throw new Error(`Missing seeded category for transaction ${seed.title}`);
    }

    const response = await requestGraphQL(
      createTransactionMutation,
      {
        input: {
          title: seed.title,
          description: seed.description,
          amount: seed.amount,
          type: seed.type,
          date: getSeedTransactionDate(anchorDate, filter, seed.day),
          categoryId: category.id,
        },
      },
      token,
    );

    if (response.errors.length > 0) {
      throw new Error(
        `Could not create transaction ${seed.title}: ${response.errors[0]?.message ?? "unknown"}`,
      );
    }
  }
};

const uploadAvatarFromFile = async (token, filePath) => {
  const file = await readFile(filePath);
  const uploadResponse = await requestGraphQL(
    requestProfileAvatarUploadUrlMutation,
    {
      input: {
        fileName: path.basename(filePath),
        contentType: "image/png",
        sizeBytes: file.byteLength,
      },
    },
    token,
  );

  const payload = uploadResponse.data?.requestProfileAvatarUploadUrl;
  if (!payload?.url || !payload.key) {
    throw new Error("requestProfileAvatarUploadUrl did not return upload payload");
  }

  const putResponse = await fetch(payload.url, {
    method: "PUT",
    headers: {
      "Content-Type": "image/png",
    },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`Avatar upload request failed with ${putResponse.status}`);
  }

  await requestGraphQL(
    updateProfileAvatarMutation,
    {
      input: {
        avatarKey: payload.key,
      },
    },
    token,
  );
};

const ensureSeedAvatar = async (token, filePath) => {
  if (BOOTSTRAP_AVATAR_SETUP_DISABLED) {
    console.log("[e2e-bootstrap] Avatar setup skipped");
    return;
  }

  let attempt = 0;
  let lastError;

  while (attempt < BOOTSTRAP_AVATAR_SETUP_RETRIES) {
    attempt += 1;
    try {
      await uploadAvatarFromFile(token, filePath);
      console.log("[e2e-bootstrap] Avatar ready");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < BOOTSTRAP_AVATAR_SETUP_RETRIES) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError;
};

const bootstrap = async () => {
  await waitForBackend();

  const loginResult = await requestGraphQL(loginMutation, {
    input: {
      email: BOOTSTRAP_USER_EMAIL,
      password: BOOTSTRAP_USER_PASSWORD,
    },
  });

  const token = loginResult.data?.login?.token;
  if (!token) {
    throw new Error(
      `Could not authenticate seed user: ${loginResult.errors?.[0]?.message ?? "unknown"}`,
    );
  }

  const meResult = await requestGraphQL(meQuery, {}, token);
  const me = meResult.data?.me;
  if (me && me.name !== BOOTSTRAP_USER_NAME) {
    const updateResult = await requestGraphQL(
      updateProfileMutation,
      {
        input: {
          name: BOOTSTRAP_USER_NAME,
        },
      },
      token,
    );

    if (updateResult.errors.length > 0) {
      throw new Error(
        `Could not normalize seed user name: ${updateResult.errors[0]?.message ?? "unknown"}`,
      );
    }
  }

  if (BOOTSTRAP_SEED_DRY_RUN) {
    console.log("[e2e-bootstrap] Seed dry run enabled. Skipping data bootstrap.");
    return;
  }

  await cleanSeedTransactions(token);
  await cleanSeedCategories(token);

  const categoriesByKey = await seedCategories(token);
  await seedTransactions(token, categoriesByKey);
  console.log("[e2e-bootstrap] Dashboard seed data ready");

  const tmpAvatarPath = await resolveAvatarPath();
  let cleanupAvatarDir = null;
  if (!AVATAR_PATH && tmpAvatarPath.includes(os.tmpdir())) {
    cleanupAvatarDir = path.dirname(tmpAvatarPath);
  }

  if (tmpAvatarPath) {
    try {
      await ensureSeedAvatar(token, tmpAvatarPath);
    } catch (error) {
      console.warn(`[e2e-bootstrap] Avatar setup skipped: ${error.message}`);
    }
  }

  if (cleanupAvatarDir) {
    await rm(cleanupAvatarDir, { recursive: true, force: true });
  }
};

bootstrap()
  .then(() => {
    console.log(`[e2e-bootstrap] Seed account ready: ${BOOTSTRAP_USER_EMAIL}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[e2e-bootstrap] Failure: ${error.message}`);
    process.exit(1);
  });
