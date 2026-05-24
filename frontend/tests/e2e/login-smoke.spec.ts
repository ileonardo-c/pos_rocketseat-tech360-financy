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

const createTransientUser = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
  const registerResponse = await page.request.post(`${API_URL}`, {
    data: {
      query: `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
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
};

const clearClientState = async (page: Page) => {
  await page.context().clearCookies();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
};

test("@smoke-login fluxo de login funcional com usuário transitório", async ({ page }) => {
  const user = buildTransientE2EUser();

  await clearClientState(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);

  await createTransientUser(page, user);

  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
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

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });
});
