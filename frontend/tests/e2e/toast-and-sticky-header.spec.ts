import { type Page, expect, test } from "@playwright/test";

import { buildTransientE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;

const registerTransientUser = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
  const response = await page.request.post(API_URL, {
    data: {
      query: `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            created
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

const login = async (page: Page, email: string, password: string) => {
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("link", { name: "Dashboard" }).waitFor({ timeout: 15_000 });
};

test("@ui toast error visibility and action message", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    const request = route.request();
    const rawBody = request.postData();

    if (!rawBody) {
      await route.continue();
      return;
    }

    const payload = JSON.parse(rawBody) as { operationName?: string } | null;
    if (payload?.operationName === "Login") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [
            {
              message: "Authentication service temporarily unavailable",
              extensions: { code: "E2E_SIM" },
            },
          ],
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("signin-email").fill("e2e-ui-error@financy.local");
  await page.getByTestId("signin-password").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page
      .getByTestId("toast-item")
      .getByText(
        "Não foi possível concluir a autenticação agora. Verifique os dados e tente novamente.",
      ),
  ).toBeVisible({ timeout: 10_000 });
  const toast = page.locator("[data-testid='toast-item'][data-toast-type='error']");
  await expect(toast).toHaveCount(1);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("data-open", "true");
  await expect(toast.getByText("Falha no login")).toBeVisible();
  await expect(toast.getByText("Repetido 3 vezes")).toBeVisible();
  await expect(toast.getByText("Tentar novamente")).toHaveCount(0);
  await expect(toast.getByText("Error")).toHaveCount(0);
  await expect(toast.getByText("Try again")).toHaveCount(0);

  await toast.getByRole("button", { name: "Fechar notificação" }).click();
  await expect(page.getByTestId("toast-slot")).toHaveAttribute("data-open", "false");
  await expect(toast).toHaveCount(0);
});

test("@ui concurrent error banners render multiple toasts", async ({ page }) => {
  const user = buildTransientE2EUser();
  await registerTransientUser(page, user);
  await login(page, user.email, user.password);

  await page.route("**/graphql", async (route) => {
    const request = route.request();
    const rawBody = request.postData();
    if (!rawBody) {
      await route.continue();
      return;
    }

    const payload = JSON.parse(rawBody) as { operationName?: string } | null;
    if (payload?.operationName === "Categories" || payload?.operationName === "Transactions") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [
            {
              message: "E2E synthetic query error",
              extensions: { code: "E2E_SIM" },
            },
          ],
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({ timeout: 10_000 });

  const toasts = page.getByTestId("toast-item");
  await expect(toasts.getByText("Não foi possível carregar categorias.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(toasts.getByText("Não foi possível carregar transações.")).toBeVisible();

  await expect(toasts).toHaveCount(2);
  expect(await toasts.count()).toBeLessThanOrEqual(3);
});

test("@ui dashboard-nav sticky on mobile with modal open", async ({ page }) => {
  const user = buildTransientE2EUser();
  await registerTransientUser(page, user);
  await page.setViewportSize({ width: 390, height: 844 });

  await login(page, user.email, user.password);
  await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Transações" }).waitFor({ timeout: 10_000 });

  const header = page.getByTestId("dashboard-nav-header");
  await expect(header).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 600, left: 0, behavior: "instant" }));
  const headerOffset = await header.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );
  expect(headerOffset).toBeLessThan(24);

  await page.getByRole("button", { name: "Nova transação" }).click();
  await expect(page.getByRole("dialog", { name: "Nova transação" })).toBeVisible({
    timeout: 10_000,
  });

  await expect(header).toBeVisible();
  const headerOffsetWithModal = await header.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );
  expect(headerOffsetWithModal).toBeLessThanOrEqual(24);
});
