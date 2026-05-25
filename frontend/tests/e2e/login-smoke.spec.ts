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

const waitForAuthenticatedDashboard = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible({
    timeout: 15_000,
  });
};

const readStoredAuthToken = async (page: Page) => {
  return page.evaluate(() => {
    return {
      local: window.localStorage.getItem("financy.token"),
      session: window.sessionStorage.getItem("financy.token"),
    };
  });
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
  await page.goto(`${APP_URL}/signup`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel("Nome").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await waitForLoginScreen(page);
  await expect(page.getByText(/conta criada com sucesso/i)).toBeVisible({ timeout: 15_000 });
};

const clearClientState = async (page: Page) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
};

test("@smoke-login @smoke-dashboard fluxo de login funcional com usuário transitório", async ({
  page,
}) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();

  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await waitForAuthenticatedDashboard(page);
  await expect(page.getByRole("link", { name: "Gerenciar categorias" })).toBeVisible({
    timeout: 15_000,
  });

  const tokens = await readStoredAuthToken(page);
  const hasToken = !!tokens.local || !!tokens.session;
  expect(hasToken).toBe(true);
  expect(typeof tokens.local === "string" ? tokens.local : tokens.session).toContain("ey");

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });
});

test("@smoke-login fluxo de cadastro funcional com usuário transitório", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await createTransientUserViaUi(page, user);

  const signupTokens = await readStoredAuthToken(page);
  expect(signupTokens.local).toBeNull();
  expect(signupTokens.session).toBeNull();

  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await waitForAuthenticatedDashboard(page);
});

test("@smoke-login remember-me persiste token em localStorage", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);
  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByTestId("signin-remember").check();
  await page.getByRole("button", { name: "Entrar" }).click();

  await waitForAuthenticatedDashboard(page);

  const rememberTokens = await readStoredAuthToken(page);
  expect(rememberTokens.local).toContain("ey");
  expect(rememberTokens.session).toBeNull();
});

test("@smoke-login remember-me sem persistência usa sessionStorage", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);
  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByTestId("signin-remember").uncheck();
  await page.getByRole("button", { name: "Entrar" }).click();

  await waitForAuthenticatedDashboard(page);

  const sessionTokens = await readStoredAuthToken(page);
  expect(sessionTokens.local).toBeNull();
  expect(sessionTokens.session).toContain("ey");
});
