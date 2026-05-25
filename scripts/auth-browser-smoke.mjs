import { chromium } from "playwright";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const frontendUrlObject = new URL(frontendUrl);
const API_HOST = process.env.E2E_API_HOST ?? frontendUrlObject.hostname;
const API_URL = process.env.E2E_API_URL ?? `${frontendUrlObject.protocol}//${API_HOST}:4000`;
const GRAPHQL_URL = API_URL.endsWith("/graphql") ? API_URL : `${API_URL}/graphql`;

const password = "SmokePass123!";
const hydrationWindowTimeoutMs = 4000;
const hydrationProbeIntervalMs = 50;
const dashboardSelectors = [/^Dashboard$/];

const registerMutation = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      created
      user { id email }
    }
  }
`;

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

const executeRegisterRequest = async (page, user) => {
  const response = await page.request.post(GRAPHQL_URL, {
    data: {
      query: registerMutation,
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
  return payload;
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
    await page.getByRole("button", { name: "Criar conta" }).click();
    await waitForAuthScreen(page);
    await page.getByText(/conta criada com sucesso/i).waitFor({ timeout: 15_000 });

    await page.goto(`${frontendUrl}/signup`, { waitUntil: "networkidle" });
    const duplicateResponse = await executeRegisterRequest(page, user);
    if (!duplicateResponse.errors?.length) {
      throw new Error("Duplicate register request returned success unexpectedly");
    }
    const duplicateMessage = `${JSON.stringify(duplicateResponse.errors?.[0]?.message ?? "")}`.toLowerCase();
    if (!duplicateMessage.includes("already") && !duplicateMessage.includes("cadastrada")) {
      throw new Error(
        `Expected duplicate register error to mention already registered account, got ${duplicateMessage}`,
      );
    }

    await page.getByLabel("Nome").fill(`Duplicate ${user.name}`);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await page.getByText(/já está cadastrada/i).waitFor({ timeout: 15_000 }).catch(() => {
      throw new Error("Duplicate register must render user-facing feedback");
    });
    const duplicateSignupTokens = await readStoredAuthToken(page);
    if (duplicateSignupTokens.local || duplicateSignupTokens.session) {
      throw new Error("Duplicate signup must not persist authentication tokens");
    }

    await page.goto(`${frontendUrl}/login`, { waitUntil: "networkidle" });
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

    await page.goto(`${frontendUrl}/login`, { waitUntil: "networkidle" });
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
