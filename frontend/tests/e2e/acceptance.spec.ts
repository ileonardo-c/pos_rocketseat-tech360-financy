import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

const password = "SmokePass123!";

const buildUser = () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    name: `E2E User ${suffix}`,
    updatedName: `E2E User Updated ${suffix}`,
    email: `e2e.${suffix}@financy.local`,
    password,
    categoryName: `Categoria E2E ${suffix}`,
    transactionTitle: `Transação E2E ${suffix}`,
  };
};

const toDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const encodeBase64Url = (value: string) => Buffer.from(value).toString("base64url");

const buildExpiredToken = () => {
  const secret = process.env.JWT_SECRET ?? "changeme";
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: "e2e-user",
      exp: Math.floor(Date.now() / 1000) - 3600,
    }),
  );
  const content = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(content).digest("base64url");
  return `${content}.${signature}`;
};

test("@smoke fluxo ponta a ponta de auth, categorias, transações e perfil", async ({ page }) => {
  const user = buildUser();
  const appUrl = process.env.E2E_APP_URL ?? "http://localhost:5173";
  const expiredToken = buildExpiredToken();

  await page.goto(`${appUrl}/signup`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Criar conta" }).waitFor();
  await page.getByLabel("Nome").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 45_000 });
  await expect(page.getByText(`Bem-vindo, ${user.name}`)).toBeVisible();

  await page.getByRole("link", { name: "Gerenciar categorias" }).click();
  await page.getByRole("heading", { name: "Categorias" }).waitFor();
  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill(user.categoryName);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByText(user.categoryName)).toBeVisible();

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Gerenciar transações" }).click();
  await page.getByRole("heading", { name: "Transações" }).waitFor();
  await page.getByRole("button", { name: "Nova transação" }).click();
  const transactionForm = page.locator("form").filter({ hasText: "Criar transação" });

  await transactionForm.getByRole("textbox", { name: "Título" }).fill(user.transactionTitle);
  await transactionForm.getByRole("textbox", { name: "Descrição" }).fill("Fluxo E2E");
  await transactionForm.getByRole("spinbutton", { name: "Valor" }).fill("120.50");
  await transactionForm.getByRole("textbox", { name: "Data" }).fill(toDateInput());
  await transactionForm.getByLabel("Categoria").selectOption({ label: user.categoryName });
  await page.getByRole("button", { name: "Criar transação" }).click();
  await expect(page.getByText("Transação criada com sucesso.")).toBeVisible();
  await expect(page.getByText(user.transactionTitle)).toBeVisible();

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Meu perfil" }).click();

  await page.getByRole("heading", { name: user.name }).waitFor();
  await page.getByLabel("Nome completo").fill(user.updatedName);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Perfil atualizado com sucesso.")).toBeVisible();
  await expect(page.getByRole("heading", { name: user.updatedName })).toBeVisible();

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await Promise.race([
    page.getByRole("heading", { name: "Criar conta" }).waitFor(),
    page.getByRole("heading", { name: "Login" }).waitFor(),
  ]);

  await page.goto(`${appUrl}/profile`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Login" }).waitFor();

  await page.evaluate(() => {
    localStorage.setItem("financy.token", "invalid.token.here");
  });
  await page.goto(`${appUrl}/categories`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Login" }).waitFor({ timeout: 15_000 });

  await page.evaluate((token) => {
    localStorage.setItem("financy.token", token);
  }, expiredToken);
  await page.goto(`${appUrl}/transactions`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Login" }).waitFor({ timeout: 15_000 });
});
