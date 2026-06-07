import { type Page, type Response, expect, test } from "@playwright/test";

import { buildTransientE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;
const APP_HOST = APP_BASE_URL.hostname;

const waitForLoginScreen = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
    timeout: 15_000,
  });
};

const waitForAuthenticatedDashboard = async (page: Page) => {
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Transações recentes")).toBeVisible({ timeout: 15_000 });
};

const waitForRouteTransitionIdle = async (page: Page) => {
  await page.waitForFunction(
    () => {
      const node = document.querySelector("[data-testid='route-transition-root']");
      return !node?.className || !/t-route-(enter|exit)/.test(node.className);
    },
    undefined,
    { timeout: 2_000 },
  );
};

const getGraphqlOperationName = (requestBody: unknown) => {
  if (!requestBody || typeof requestBody !== "object") {
    return null;
  }

  const body = requestBody as { operationName?: string; query?: string };
  return body.operationName ?? body.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? null;
};

const isGraphqlOperationResponse = (response: Response, operationName: string) => {
  if (!response.url().includes("/graphql") || response.request().method() !== "POST") {
    return false;
  }

  const rawBody = response.request().postData() ?? "";
  if (
    rawBody.includes(`"operationName":"${operationName}"`) ||
    rawBody.includes(`mutation ${operationName}`) ||
    rawBody.includes(`query ${operationName}`)
  ) {
    return true;
  }

  try {
    return getGraphqlOperationName(response.request().postDataJSON?.()) === operationName;
  } catch {
    return false;
  }
};

const submitLoginForm = async (page: Page, user: { email: string; password: string }) => {
  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);

  const submitButton = page.getByRole("button", { name: "Entrar" });
  const loginResponse = page.waitForResponse((response) => {
    return isGraphqlOperationResponse(response, "Login");
  });

  await expect(submitButton).toBeEnabled({ timeout: 15_000 });
  await submitButton.click({ timeout: 15_000 });
  const response = await loginResponse;
  const payload = await response.json();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.login?.token).toBeTruthy();
};

const createTransientUser = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
  const registerResponse = await page.request.post(`${API_URL}`, {
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

  const payload = await registerResponse.json();
  expect(registerResponse.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.register?.created).toBeTruthy();
};

const createTransientUserViaUi = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);
  await waitForRouteTransitionIdle(page);
  await page.getByRole("link", { name: "Criar conta" }).click();
  await page.waitForURL(/\/signup/, { timeout: 15_000, waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
    timeout: 15_000,
  });
  await waitForRouteTransitionIdle(page);

  const nameInput = page.getByTestId("signup-name");
  const emailInput = page.getByTestId("signup-email");
  const passwordInput = page.getByTestId("signup-password");
  const signupForm = page.getByTestId("signup-form");

  await expect(nameInput).toBeVisible({ timeout: 15_000 });
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await expect(passwordInput).toBeVisible({ timeout: 15_000 });
  await expect(nameInput).toBeEnabled({ timeout: 15_000 });
  await expect(emailInput).toBeEnabled({ timeout: 15_000 });
  await expect(passwordInput).toBeEnabled({ timeout: 15_000 });
  await expect(nameInput).toBeEditable({ timeout: 15_000 });
  await expect(emailInput).toBeEditable({ timeout: 15_000 });
  await expect(passwordInput).toBeEditable({ timeout: 15_000 });

  await nameInput.fill(user.name);
  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  await expect(nameInput).toHaveValue(user.name);
  await expect(emailInput).toHaveValue(user.email);
  await expect(passwordInput).toHaveValue(user.password);
  await waitForRouteTransitionIdle(page);

  const submitButton = page.getByRole("button", { name: "Cadastrar" });
  const registerResponse = page.waitForResponse((response) => {
    return response.ok() && isGraphqlOperationResponse(response, "Register");
  });

  await expect(submitButton).toBeEnabled({ timeout: 15_000 });
  await submitButton.click({ timeout: 15_000 });
  const response = await registerResponse;
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.errors).toBeFalsy();
  expect(payload.data?.register?.created).toBeTruthy();
  await expect(signupForm).toBeHidden({ timeout: 15_000 });
  await page.waitForURL(/\/login/, { timeout: 15_000, waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({ timeout: 15_000 });
};

const clearClientState = async (page: Page) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};

test("@smoke-login functional login flow with a transient user", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();

  await submitLoginForm(page, user);

  await waitForAuthenticatedDashboard(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Nenhuma categoria encontrada.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Não foi possível carregar categorias.")).toHaveCount(0);
});

test("@smoke-login functional signup flow with a transient user", async ({ page }) => {
  test.setTimeout(90_000);
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await createTransientUserViaUi(page, user);

  await submitLoginForm(page, user);
  await waitForAuthenticatedDashboard(page);
});

test("@smoke-login public routes stay accessible without a session", async ({ page }) => {
  await clearClientState(page);

  await page.goto(`${APP_URL}/signup`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
    timeout: 15_000,
  });

  await page.goto(`${APP_URL}/forgot-password`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible({
    timeout: 15_000,
  });
});

test("@smoke-login invalid session on /categories redirects to /login without banner", async ({
  page,
}) => {
  await clearClientState(page);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.context().addCookies([
    {
      name: "financy_session",
      value: "invalid.token.here",
      domain: APP_HOST,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Não foi possível carregar categorias.")).toHaveCount(0);
});
