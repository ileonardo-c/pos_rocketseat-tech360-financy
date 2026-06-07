import { expect, test } from "@playwright/test";

import { buildTransientE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;

const clearClientState = async (page) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};

const waitForLoginScreen = async (page) => {
  await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({ timeout: 15_000 });
};

const waitForCategoriesPage = async (page) => {
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({ timeout: 15_000 });
};

const waitForTransactionsPage = async (page) => {
  await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Descrição")).toBeVisible({ timeout: 15_000 });
};

const registerUser = async (page, user) => {
  const response = await page.request.post(API_URL, {
    data: {
      query: `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            created
            user {
              id
              email
            }
          }
        }
      `,
      variables: {
        input: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.register?.created).toBeTruthy();
};

const loginWithUi = async (page, user) => {
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);
  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
};

const loginByApi = async (page, user) => {
  const response = await page.request.post(API_URL, {
    data: {
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
          }
        }
      `,
      variables: {
        input: {
          email: user.email,
          password: user.password,
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.login?.token).toBeTruthy();

  return payload.data.login.token;
};

const createCategoryByApi = async (page, token, name) => {
  const response = await page.request.post(API_URL, {
    headers: {
      authorization: `Bearer ${token}`,
    },
    data: {
      query: `
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          name,
          description: "Categoria para validação de escopo do usuário.",
          icon: "utensils",
          color: "blue",
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  return payload.data?.createCategory?.id;
};

const createTransactionByApi = async (page, token, input) => {
  const response = await page.request.post(API_URL, {
    headers: {
      authorization: `Bearer ${token}`,
    },
    data: {
      query: `
        mutation CreateTransaction($input: CreateTransactionInput!) {
          createTransaction(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          title: input.title,
          description: "Transação para validar isolamento de escopo",
          amount: 49.9,
          type: "EXPENSE",
          date: new Date().toISOString().slice(0, 10),
          categoryId: input.categoryId,
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  return payload.data?.createTransaction?.id;
};

test("@ownership user cannot see another user's category or transaction data", async ({ page }) => {
  const owner = buildTransientE2EUser();
  const outsider = buildTransientE2EUser();
  const categoryName = `Categoria Owner ${Date.now()}`;
  const transactionName = `Transação Owner ${Date.now() + 1}`;

  await clearClientState(page);
  await registerUser(page, owner);
  const ownerToken = await loginByApi(page, owner);
  const ownerCategoryId = await createCategoryByApi(page, ownerToken, categoryName);
  expect(ownerCategoryId).toBeTruthy();
  const ownerTransactionId = await createTransactionByApi(page, ownerToken, {
    title: transactionName,
    categoryId: ownerCategoryId,
  });
  expect(ownerTransactionId).toBeTruthy();

  await loginWithUi(page, owner);
  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForCategoriesPage(page);
  await expect(page.getByRole("heading", { name: categoryName })).toBeVisible({ timeout: 10_000 });

  await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
  await waitForTransactionsPage(page);
  await expect(page.getByText(transactionName)).toBeVisible({ timeout: 10_000 });

  await clearClientState(page);
  await registerUser(page, outsider);
  await loginWithUi(page, outsider);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForCategoriesPage(page);
  await expect(page.getByRole("heading", { name: categoryName })).toHaveCount(0);

  await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
  await waitForTransactionsPage(page);
  await expect(page.getByText(transactionName)).toHaveCount(0);
  await expect(
    page.getByText("Nenhuma transação encontrada para o período selecionado."),
  ).toBeVisible();
});
