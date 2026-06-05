import { type Page, expect, test } from "@playwright/test";

import { buildTransientE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";
const APP_BASE_URL = new URL(APP_URL);
const API_BASE_HOST = process.env.E2E_API_HOST ?? APP_BASE_URL.hostname;
const API_URL =
  process.env.E2E_API_URL ?? `${APP_BASE_URL.protocol}//${API_BASE_HOST}:4000/graphql`;

type ModalTransitionSample = {
  className: string | null;
  overlayClassName: string | null;
  opacity: number | null;
  overlayOpacity: number | null;
  transform: string | null;
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

const loginTransientUser = async (page: Page) => {
  const user = buildTransientE2EUser();

  await page.context().clearCookies();
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await createTransientUser(page, user);

  await page.getByRole("heading", { name: "Fazer login" }).waitFor({ timeout: 15_000 });
  await page.getByTestId("signin-email").fill(user.email);
  await page.getByTestId("signin-password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Transações recentes")).toBeVisible({ timeout: 45_000 });
};

const goToRoute = async (page: Page, routeLinkName: string, routeHref?: string) => {
  const link = page.getByRole("link", { name: routeLinkName });

  if ((await link.count()) > 0) {
    await link.click();
    return;
  }

  if (!routeHref) {
    throw new Error(`Route link not found: ${routeLinkName}`);
  }

  await page.locator(`a[href="${routeHref}"]`).first().click();
};

const startModalTransitionObserver = async (page: Page) => {
  await page.evaluate(() => {
    const hostWindow = window as Window & {
      __modalTransitionObserver?: MutationObserver;
      __modalTransitionSamples?: ModalTransitionSample[];
    };

    hostWindow.__modalTransitionObserver?.disconnect();
    hostWindow.__modalTransitionSamples = [];

    const sample = () => {
      const modal = document.querySelector(".t-modal");
      const overlay = document.querySelector(".t-modal-overlay");
      if (!modal || !overlay) {
        return;
      }

      const modalStyle = window.getComputedStyle(modal);
      const overlayStyle = window.getComputedStyle(overlay);
      hostWindow.__modalTransitionSamples?.push({
        className: modal.className,
        overlayClassName: overlay.className,
        opacity: Number.parseFloat(modalStyle.opacity),
        overlayOpacity: Number.parseFloat(overlayStyle.opacity),
        transform: modalStyle.transform,
      });
    };

    const observer = new MutationObserver(sample);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });

    hostWindow.__modalTransitionObserver = observer;
  });
};

const readModalTransitionSamples = async (page: Page) =>
  page.evaluate(() => {
    const hostWindow = window as Window & {
      __modalTransitionObserver?: MutationObserver;
      __modalTransitionSamples?: ModalTransitionSample[];
    };

    const modal = document.querySelector(".t-modal");
    const overlay = document.querySelector(".t-modal-overlay");
    if (modal && overlay) {
      const modalStyle = window.getComputedStyle(modal);
      const overlayStyle = window.getComputedStyle(overlay);
      hostWindow.__modalTransitionSamples?.push({
        className: modal.className,
        overlayClassName: overlay.className,
        opacity: Number.parseFloat(modalStyle.opacity),
        overlayOpacity: Number.parseFloat(overlayStyle.opacity),
        transform: modalStyle.transform,
      });
    }

    hostWindow.__modalTransitionObserver?.disconnect();
    hostWindow.__modalTransitionObserver = undefined;
    return hostWindow.__modalTransitionSamples ?? [];
  });

const getRouteTransitionClass = async (page: Page) =>
  (await page.getByTestId("route-transition-root").getAttribute("class")) ?? "";

const waitForTransitionClasses = async (page: Page, previousClass: string, timeoutMs = 1200) => {
  const routeRoot = page.locator("[data-testid='route-transition-root']");
  const classes = new Set<string>([previousClass]);
  const start = Date.now();
  let hasTransitionClass = false;
  const isTransitionClass = (value: string) => /t-route-(enter|exit)/.test(value);

  while (Date.now() - start < timeoutMs) {
    const className = (await routeRoot.getAttribute("class")) ?? "";
    classes.add(className);

    if (isTransitionClass(className)) {
      hasTransitionClass = true;
      break;
    }

    await page.waitForTimeout(50);
  }

  return {
    classes: Array.from(classes),
    hadTransitionClass: hasTransitionClass,
  };
};

const waitForRouteTransitionIdle = async (page: Page, timeoutMs = 1800) => {
  await page.waitForFunction(
    () => {
      const node = document.querySelector("[data-testid='route-transition-root']");
      return !node?.className || !/t-route-(enter|exit)/.test(node.className);
    },
    undefined,
    { timeout: timeoutMs },
  );
};

test("@transition valida transições de rota sem disparo em busca", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await loginTransientUser(page);

  const baseClass = await getRouteTransitionClass(page);
  expect(baseClass).toContain("t-route");

  const transactionsStart = await getRouteTransitionClass(page);
  await goToRoute(page, "Transações");
  await expect(page).toHaveURL(/\/transactions/);
  const transactionsTransition = await waitForTransitionClasses(page, transactionsStart);
  expect(transactionsTransition.hadTransitionClass).toBeTruthy();
  await waitForRouteTransitionIdle(page);
  const transactionsEnd = await getRouteTransitionClass(page);
  expect(transactionsEnd).toContain("t-route");
  expect(transactionsEnd).not.toMatch(/t-route-(enter|exit)/);

  const categoriesStart = await getRouteTransitionClass(page);
  await goToRoute(page, "Categorias");
  await expect(page).toHaveURL(/\/categories/);
  const categoriesTransition = await waitForTransitionClasses(page, categoriesStart);
  expect(categoriesTransition.hadTransitionClass).toBeTruthy();
  await waitForRouteTransitionIdle(page);
  const categoriesEnd = await getRouteTransitionClass(page);
  expect(categoriesEnd).toContain("t-route");
  expect(categoriesEnd).not.toMatch(/t-route-(enter|exit)/);

  const profileStart = await getRouteTransitionClass(page);
  await goToRoute(page, "Perfil", "/profile");
  await expect(page).toHaveURL(/\/profile/);
  const profileTransition = await waitForTransitionClasses(page, profileStart);
  expect(profileTransition.hadTransitionClass).toBeTruthy();
  await waitForRouteTransitionIdle(page);
  const profileEnd = await getRouteTransitionClass(page);
  expect(profileEnd).toContain("t-route");
  expect(profileEnd).not.toMatch(/t-route-(enter|exit)/);

  const backToTransactionsStart = await getRouteTransitionClass(page);
  await goToRoute(page, "Transações", "/transactions");
  await expect(page).toHaveURL(/\/transactions/);
  const backToTransactionsTransition = await waitForTransitionClasses(
    page,
    backToTransactionsStart,
  );
  expect(backToTransactionsTransition.hadTransitionClass).toBeTruthy();
  await waitForRouteTransitionIdle(page);
  const backToTransactionsEnd = await getRouteTransitionClass(page);
  expect(backToTransactionsEnd).toContain("t-route");
  expect(backToTransactionsEnd).not.toMatch(/t-route-(enter|exit)/);

  const beforeSearchChangeClass = await getRouteTransitionClass(page);
  await page.getByLabel("Buscar").fill("teste");
  await page.waitForTimeout(1_200);
  const afterSearchChangeClass = await getRouteTransitionClass(page);
  expect(afterSearchChangeClass).toBe(beforeSearchChangeClass);
});

test("@transition valida abertura e fechamento do modal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await loginTransientUser(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });

  await startModalTransitionObserver(page);
  await page.getByRole("button", { name: "Nova categoria" }).click();
  await expect(page.getByRole("dialog", { name: "Nova categoria" })).toBeVisible({
    timeout: 10_000,
  });
  await page.waitForTimeout(320);

  const openSamples = await readModalTransitionSamples(page);
  expect(openSamples.length).toBeGreaterThan(0);
  expect(
    openSamples.some(
      (sample) =>
        sample.className !== null &&
        !sample.className.includes("is-open") &&
        !sample.className.includes("is-closing") &&
        ((sample.opacity ?? 1) < 1 || sample.transform !== "matrix(1, 0, 0, 1, 0, 0)"),
    ),
  ).toBeTruthy();
  expect(
    openSamples.some(
      (sample) =>
        sample.className?.includes("is-open") &&
        sample.overlayClassName?.includes("is-open") &&
        sample.opacity === 1 &&
        sample.overlayOpacity === 1 &&
        sample.transform === "matrix(1, 0, 0, 1, 0, 0)",
    ),
  ).toBeTruthy();

  await startModalTransitionObserver(page);
  await page
    .getByRole("dialog", { name: "Nova categoria" })
    .getByRole("button", { name: "Fechar" })
    .click();
  await expect(page.getByRole("dialog", { name: "Nova categoria" })).toHaveCount(0, {
    timeout: 10_000,
  });

  const closeSamples = await readModalTransitionSamples(page);
  expect(
    closeSamples.some(
      (sample) =>
        sample.className?.includes("is-closing") && sample.overlayClassName?.includes("is-closing"),
    ),
  ).toBeTruthy();
});

test("@transition modal respeita redução de movimento", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginTransientUser(page);

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Nova categoria" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova categoria" });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".t-modal")).toHaveClass(/is-open/);

  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 1_000 });
});
