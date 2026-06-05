import { type Page, expect, test } from "@playwright/test";

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

  await page.getByTestId("signup-name").fill(user.name);
  await page.getByTestId("signup-email").fill(user.email);
  await page.getByTestId("signup-password").fill(user.password);
  await page.getByTestId("signup-password").press("Enter");
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

test("@smoke-login fluxo de login funcional com usuário transitório", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();

  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await waitForAuthenticatedDashboard(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Nenhuma categoria encontrada.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Não foi possível carregar categorias.")).toHaveCount(0);
});

test("@smoke-login fluxo de cadastro funcional com usuário transitório", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await createTransientUserViaUi(page, user);

  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await waitForAuthenticatedDashboard(page);
});

test("@smoke-login sessão inválida em /categories redireciona para /login sem banner", async ({
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
