import { type Page, expect, test } from "@playwright/test";

import { buildTransientE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;

const waitForLoginScreen = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
    timeout: 15_000,
  });
};

const waitForTransactionsPage = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Descrição")).toBeVisible({ timeout: 15_000 });
};

const waitForAuthEntry = async (page: Page) => {
  await expect(page, "URL should remain on the login entry point").toHaveURL(/\/login|\/$/);
  const emailInput = page.getByTestId("signin-email");
  const passwordInput = page.getByTestId("signin-password");
  const dashboardLink = page.getByRole("link", { name: "Dashboard" });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const hasSigninEmail = await emailInput.isVisible().catch(() => false);
    const hasSigninPassword = await passwordInput.isVisible().catch(() => false);
    if (hasSigninEmail && hasSigninPassword) {
      await expect(emailInput).toBeVisible({ timeout: 15_000 });
      await expect(passwordInput).toBeVisible({ timeout: 15_000 });
      await expect(emailInput).toBeEnabled({ timeout: 15_000 });
      await expect(passwordInput).toBeEnabled({ timeout: 15_000 });
      return "signin";
    }

    if (await dashboardLink.isVisible().catch(() => false)) {
      return "dashboard";
    }

    await page.waitForTimeout(250);
  }

  throw new Error("Unable to determine the authentication state on /login.");
};

const waitForDashboardReady = async (page: Page) => {
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Transações recentes" })).toBeVisible({
    timeout: 15_000,
  });
};

const clearClientState = async (page: Page) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};

const createTransientUser = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
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

const loginByApi = async (
  page: Page,
  user: { email: string; password: string },
): Promise<string> => {
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

const createCategoryByApi = async (page: Page, token: string, name: string): Promise<string> => {
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
          description: "Categoria criada para validar paginação.",
          icon: "utensils",
          color: "blue",
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.createCategory?.id).toBeTruthy();

  return payload.data.createCategory.id;
};

const loginByUi = async (page: Page, user: { email: string; password: string }) => {
  const authEntry = await waitForAuthEntry(page);
  if (authEntry === "dashboard") {
    await waitForDashboardReady(page);
    return;
  }

  const loginResponse = page.waitForResponse((response) => {
    if (!response.url().includes("/graphql") || response.request().method() !== "POST") {
      return false;
    }

    const body = response.request().postDataJSON?.();
    return body?.operationName === "Login" || body?.query?.match(/mutation\s+Login\b/) !== null;
  });

  await waitForAuthEntry(page);
  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: "Entrar" }).click();

  await loginResponse;
  await waitForDashboardReady(page);
};

const createTransactionByApi = async (
  page: Page,
  token: string,
  input: {
    title: string;
    date: string;
    amount: number;
    categoryId: string;
  },
): Promise<string> => {
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
          description: null,
          amount: input.amount,
          type: "EXPENSE",
          date: input.date,
          categoryId: input.categoryId,
        },
      },
    },
  });

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.createTransaction?.id).toBeTruthy();

  return payload.data.createTransaction.id;
};

const navigateWithPopState = async (page: Page, pathAndSearch: string) => {
  await page.evaluate((target) => {
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, pathAndSearch);
};

test.describe("@smoke-dashboard dashboard access flow", () => {
  test("@smoke-dashboard loads dashboard and protects the route", async ({ page }) => {
    const user = buildTransientE2EUser();

    await clearClientState(page);

    await createTransientUser(page, user);
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForLoginScreen(page);
    await loginByUi(page, user);
    const dashboardTopGap = await page.evaluate(() => {
      const section = document.querySelector('[data-testid="dashboard-transactions-section"]');
      if (!section) return -1;
      const header = section.querySelector("header");
      const firstRow = section.querySelector("li");
      if (!header || !firstRow) return -1;
      const headerRect = header.getBoundingClientRect();
      const firstRowRect = firstRow.getBoundingClientRect();
      return Math.round(firstRowRect.top - headerRect.bottom);
    });
    expect(Math.abs(dashboardTopGap)).toBeLessThanOrEqual(2);

    await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
    await waitForTransactionsPage(page);
    await expect(page.getByText(/resultados/i)).toBeVisible({ timeout: 15_000 });

    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForLoginScreen(page);
  });

  test("@smoke-dashboard keeps paginated transactions from showing a false empty state", async ({
    page,
  }) => {
    const user = buildTransientE2EUser();
    const marker = Date.now();

    await clearClientState(page);
    await createTransientUser(page, user);

    const token = await loginByApi(page, user);
    const categoryId = await createCategoryByApi(page, token, `Paginação ${marker}`);
    let shouldDelayNextTransactionsCount = false;

    for (let index = 1; index <= 15; index += 1) {
      await createTransactionByApi(page, token, {
        title: `Transação Paginação ${marker} ${String(index).padStart(2, "0")}`,
        date: `2026-06-${String(index).padStart(2, "0")}`,
        amount: 10 + index,
        categoryId,
      });
    }

    await page.route("**/graphql", async (route) => {
      const request = route.request();
      const body = request.method() === "POST" ? request.postDataJSON?.() : null;
      const operationName =
        body?.operationName ?? body?.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1];

      if (operationName === "TransactionsCount" && shouldDelayNextTransactionsCount) {
        shouldDelayNextTransactionsCount = false;
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }

      if (operationName === "Transactions" && body?.variables?.page === 2) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      await route.continue();
    });

    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await loginByUi(page, user);

    shouldDelayNextTransactionsCount = true;
    await page.goto(`${APP_URL}/transactions?from=2026-06-01&to=2026-06-30&page=2`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/page=2/, { timeout: 15_000 });
    await expect
      .poll(() => new URL(page.url()).searchParams.get("page"), { timeout: 1_200 })
      .toBe("2");
    await expect(page.getByText("11 a 15 | 15 resultados")).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/page=2/, { timeout: 15_000 });

    shouldDelayNextTransactionsCount = true;
    await page.goto(`${APP_URL}/transactions?from=2026-06-01&to=2026-06-30&page=999`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/page=999/, { timeout: 10_000 });
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/page=999/, { timeout: 1_000 });
    await expect
      .poll(() => new URL(page.url()).searchParams.get("page"), { timeout: 12_000 })
      .toBe("2");
    await expect(page).toHaveURL(/page=2/, { timeout: 12_000 });

    await page.goto(`${APP_URL}/transactions?from=2026-06-01&to=2026-06-30`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText("1 a 10 | 15 resultados")).toBeVisible({ timeout: 15_000 });

    const pageTwoResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/graphql") || response.request().method() !== "POST") {
        return false;
      }

      const body = response.request().postDataJSON?.();
      const operationName =
        body?.operationName ?? body?.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1];

      return operationName === "Transactions" && body?.variables?.page === 2;
    });

    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/page=2/, { timeout: 15_000 });
    await expect(page.getByText("Carregando transações...")).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Nenhuma transação encontrada para o período selecionado."),
    ).toHaveCount(0);

    const response = await pageTwoResponse;
    const payload = await response.json();
    expect(payload.data?.transactions).toHaveLength(5);

    await expect(page.getByText("11 a 15 | 15 resultados")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Transação Paginação ${marker} 05`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Nenhuma transação encontrada para o período selecionado."),
    ).toHaveCount(0);

    const debounceCheckStartedAt = Date.now();
    await expect
      .poll(
        () => {
          if (Date.now() - debounceCheckStartedAt < 1_200) {
            return "waiting";
          }

          return new URL(page.url()).searchParams.get("page");
        },
        { timeout: 3_000 },
      )
      .toBe("2");

    await page.getByLabel("Buscar").fill(`Transação Paginação ${marker} 01`);
    await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe(null);
    expect(new URL(page.url()).searchParams.get("query")).toBe(`Transação Paginação ${marker} 01`);
  });

  test("@smoke-dashboard transactions sync URL-backed period across query changes", async ({
    page,
  }) => {
    const user = buildTransientE2EUser();
    const marker = Date.now();
    const mayTitle = `URL Sync May ${marker}`;
    const juneTitle = `URL Sync June ${marker}`;

    await clearClientState(page);
    await createTransientUser(page, user);

    const token = await loginByApi(page, user);
    const categoryId = await createCategoryByApi(page, token, `URL Sync ${marker}`);

    await createTransactionByApi(page, token, {
      title: mayTitle,
      date: "2026-05-15",
      amount: 51,
      categoryId,
    });
    await createTransactionByApi(page, token, {
      title: juneTitle,
      date: "2026-06-15",
      amount: 61,
      categoryId,
    });

    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await loginByUi(page, user);

    await page.goto(`${APP_URL}/transactions?from=2026-05-01&to=2026-05-31`, {
      waitUntil: "domcontentloaded",
    });
    await waitForTransactionsPage(page);
    await expect(page.getByTestId("transactions-period")).toContainText("Maio / 2026", {
      timeout: 15_000,
    });
    await expect(page.getByText(mayTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(juneTitle)).toHaveCount(0);
    await expect(page).toHaveURL(/from=2026-05-01&to=2026-05-31/);

    await navigateWithPopState(page, "/transactions?from=2026-06-01&to=2026-06-30");
    await expect(page).toHaveURL(/from=2026-06-01&to=2026-06-30/);
    await expect(page.getByTestId("transactions-period")).toContainText("Junho / 2026", {
      timeout: 15_000,
    });
    await expect(page.getByText(juneTitle)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(mayTitle)).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/from=2026-05-01&to=2026-05-31/);
    await expect(page.getByTestId("transactions-period")).toContainText("Maio / 2026", {
      timeout: 15_000,
    });
    await expect(page.getByText(mayTitle)).toBeVisible({ timeout: 15_000 });

    await page.goForward();
    await expect(page).toHaveURL(/from=2026-06-01&to=2026-06-30/);
    await expect(page.getByTestId("transactions-period")).toContainText("Junho / 2026", {
      timeout: 15_000,
    });
    await expect(page.getByText(juneTitle)).toBeVisible({ timeout: 15_000 });

    await navigateWithPopState(page, "/transactions?from=invalid&to=2026-06-30");
    await expect(page).toHaveURL(/from=2026-06-01&to=2026-06-30/, { timeout: 15_000 });
    await expect(page.getByTestId("transactions-period")).toContainText("Junho / 2026", {
      timeout: 15_000,
    });

    await navigateWithPopState(page, "/transactions");
    await expect(page).toHaveURL(/\/transactions\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/, {
      timeout: 15_000,
    });

    await page.getByTestId("transactions-period").click();
    await page
      .locator(".t-dropdown button")
      .filter({ hasText: /^Maio$/ })
      .click();
    await expect(page).toHaveURL(/from=2026-05-01&to=2026-05-31/, { timeout: 15_000 });
    await expect(page.getByText(mayTitle)).toBeVisible({ timeout: 15_000 });
  });

  test("@smoke-dashboard transaction delete modal shows loading and closes after mutation", async ({
    page,
  }) => {
    const user = buildTransientE2EUser();
    const marker = Date.now();
    const transactionTitle = `Delete Modal ${marker}`;

    await clearClientState(page);
    await createTransientUser(page, user);

    const token = await loginByApi(page, user);
    const categoryId = await createCategoryByApi(page, token, `Deletion Category ${marker}`);
    await createTransactionByApi(page, token, {
      title: transactionTitle,
      date: "2026-06-15",
      amount: 32,
      categoryId,
    });

    await page.route("**/graphql", async (route) => {
      const request = route.request();
      const body = request.method() === "POST" ? request.postDataJSON?.() : null;
      const operationName =
        body?.operationName ?? body?.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1];

      if (operationName === "DeleteTransaction") {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      await route.continue();
    });

    await page.goto(`${APP_URL}/transactions?from=2026-06-01&to=2026-06-30`, {
      waitUntil: "domcontentloaded",
    });
    await waitForTransactionsPage(page);

    const row = page.getByRole("listitem").filter({ hasText: transactionTitle });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole("button", { name: "Excluir transação" }).click();

    const dialog = page.getByRole("dialog", { name: "Excluir transação" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const deleteResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/graphql") || response.request().method() !== "POST") {
        return false;
      }

      const body = response.request().postDataJSON?.();
      const operationName =
        body?.operationName ?? body?.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1];

      return operationName === "DeleteTransaction";
    });

    await dialog.getByRole("button", { name: "Excluir transação" }).click();
    await expect(dialog.getByRole("button", { name: "Excluindo..." })).toBeDisabled();
    await expect(dialog.getByText("Excluindo transação...")).toBeVisible();

    const response = await deleteResponse;
    const payload = await response.json();
    expect(payload.data?.deleteTransaction).toBe(true);

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("Transação excluída com sucesso.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(row).toHaveCount(0, { timeout: 15_000 });
  });
});
