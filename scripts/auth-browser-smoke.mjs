import { chromium } from "playwright";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const password = "SmokePass123!";
const hydrationWindowTimeoutMs = 4000;
const hydrationProbeIntervalMs = 50;

const buildUser = () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    name: `Smoke Browser ${suffix}`,
    email: `smoke.browser.${suffix}@financy.local`,
    password,
  };
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

    await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 20_000 });
    await page.getByText(`Bem-vindo, ${user.name}`).waitFor({ timeout: 20_000 });

    await page.getByRole("button", { name: "Sair" }).click();
    await page
      .locator("h1")
      .filter({ hasText: /^(Login|Criar conta)$/ })
      .first()
      .waitFor({ timeout: 20_000 });

    await page.goto(`${frontendUrl}/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Login" }).waitFor({ timeout: 20_000 });

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 20_000 });

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 20_000 });

    await page.evaluate(() => {
      localStorage.setItem("financy.token", "invalid.token");
    });
    await page.goto(`${frontendUrl}/categories`, { waitUntil: "domcontentloaded" });
    const hydrationProbeStart = Date.now();
    let authScreenVisible = false;
    while (Date.now() - hydrationProbeStart < hydrationWindowTimeoutMs) {
      const dashboardHeadingCount = await page.getByRole("heading", { name: "Dashboard" }).count();
      if (dashboardHeadingCount > 0) {
        throw new Error("Protected dashboard content flashed during invalid-token hydration");
      }

      const loginHeadingCount = await page.getByRole("heading", { name: "Login" }).count();
      const signupHeadingCount = await page.getByRole("heading", { name: "Criar conta" }).count();
      if (loginHeadingCount > 0 || signupHeadingCount > 0) {
        authScreenVisible = true;
      }

      await page.waitForTimeout(hydrationProbeIntervalMs);
    }
    if (!authScreenVisible) {
      throw new Error("Auth screen did not stabilize after invalid-token hydration window");
    }
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Login" }).waitFor({ timeout: 20_000 });

    await page.goto(`${frontendUrl}/categories`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Login" }).waitFor({ timeout: 20_000 });

    console.log("auth-browser-smoke: all scenarios passed");
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error(`auth-browser-smoke failed: ${error.message}`);
  process.exit(1);
});
