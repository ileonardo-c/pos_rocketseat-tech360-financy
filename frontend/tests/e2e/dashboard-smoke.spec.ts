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

const waitForDashboard = async (page: Page) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible({ timeout: 15_000 });
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

  const payload = await response.json();
  expect(response.ok()).toBeTruthy();
  expect(payload.errors).toBeFalsy();
};

const readStoredAuthToken = async (page: Page) => {
  return page.evaluate(() => {
    return {
      local: localStorage.getItem("financy.token"),
      session: sessionStorage.getItem("financy.token"),
    };
  });
};

test.describe("@smoke-dashboard fluxo de acesso ao dashboard", () => {
  test("@smoke-dashboard valida carregamento e proteção de rota do dashboard", async ({ page }) => {
    const user = buildTransientE2EUser();

    await clearClientState(page);

    await createTransientUser(page, user);
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForLoginScreen(page);

    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    await waitForDashboard(page);
    await expect(page.getByText(`Bem-vindo, ${user.name}`)).toBeVisible();

    const tokens = await readStoredAuthToken(page);
    expect(Boolean(tokens.local) || Boolean(tokens.session)).toBe(true);

    await page.evaluate(() => {
      localStorage.removeItem("financy.token");
      sessionStorage.removeItem("financy.token");
    });
    await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForLoginScreen(page);
  });
});
