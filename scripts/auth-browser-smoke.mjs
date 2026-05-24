import { chromium } from "playwright";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

const password = "SmokePass123!";
const hydrationWindowTimeoutMs = 4000;
const hydrationProbeIntervalMs = 50;
const dashboardSelectors = [/^Dashboard$/];

const waitForAuthenticatedScreen = async (page) => {
  await page.getByRole("button", { name: "Sair" }).waitFor({ timeout: 15_000 });
};

const waitForAuthScreen = async (page) => {
  await page
    .locator("h1")
    .filter({ hasText: /^(Fazer login|Login|Criar conta)$/ })
    .first()
    .waitFor({ timeout: 15_000 });
};

const buildUser = () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    name: `Smoke Browser ${suffix}`,
    email: `smoke.browser.${suffix}@financy.local`,
    password,
  };
};

const readStoredAuthToken = async (page) => {
  return page.evaluate(() => ({
    local: localStorage.getItem("financy.token"),
    session: sessionStorage.getItem("financy.token"),
  }));
};

const run = async () => {
  const user = buildUser();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${frontendUrl}/signup`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Criar conta" }).waitFor({ timeout: 15_000 });

    await page.getByLabel("Nome").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await waitForAuthenticatedScreen(page);

    await page.getByRole("button", { name: "Sair" }).click();
    await waitForAuthScreen(page);

    await page.goto(`${frontendUrl}/`, { waitUntil: "networkidle" });
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await waitForAuthenticatedScreen(page);

    const transientTokens = await readStoredAuthToken(page);
    if (transientTokens.local !== null) {
      throw new Error("Transient login should not persist token in localStorage");
    }
    if (!transientTokens.session) {
      throw new Error("Transient login should persist token in sessionStorage");
    }

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle" });
    const loginAfterClear = await page
      .locator("h1")
      .filter({ hasText: /^(Fazer login|Login|Criar conta)$/ })
      .count();
    if (loginAfterClear === 0) {
      throw new Error("Login screen must be visible after transient session storage cleanup");
    }

    await page.goto(`${frontendUrl}/`, { waitUntil: "networkidle" });
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByTestId("signin-remember").check();
    await page.getByRole("button", { name: "Entrar" }).click();
    await waitForAuthenticatedScreen(page);

    const persistentTokens = await readStoredAuthToken(page);
    if (!persistentTokens.local) {
      throw new Error("Remembered login should persist token in localStorage");
    }
    if (persistentTokens.session !== null) {
      throw new Error("Persistent login should not keep sessionStorage token");
    }

    await page.evaluate(() => {
      localStorage.setItem("financy.token", "invalid.token.here");
    });
    await page.goto(`${frontendUrl}/categories`, { waitUntil: "domcontentloaded" });
    const hydrationProbeStart = Date.now();
    let authScreenVisible = false;
    while (Date.now() - hydrationProbeStart < hydrationWindowTimeoutMs) {
      const dashboardHeadingCount = await page
        .getByRole("heading", { name: dashboardSelectors[0] })
        .count();
      if (dashboardHeadingCount > 0) {
        throw new Error("Protected dashboard content flashed during invalid-token hydration");
      }

      const loginHeadingCount = await page
        .locator("h1")
        .filter({ hasText: /^(Fazer login|Login|Criar conta)$/ })
        .count();
      if (loginHeadingCount > 0) {
        authScreenVisible = true;
      }

      await page.waitForTimeout(hydrationProbeIntervalMs);
    }

    if (!authScreenVisible) {
      throw new Error("Auth screen did not stabilize after invalid-token hydration window");
    }

    console.log("auth-browser-smoke: all scenarios passed");
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(`auth-browser-smoke failed: ${error.message}`);
  process.exit(1);
});
