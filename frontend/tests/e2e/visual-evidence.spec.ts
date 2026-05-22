import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

const password = "VisualPass123!";

const buildUser = () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    name: `Visual User ${suffix}`,
    email: `visual.${suffix}@financy.local`,
    password,
    categoryName: `Categoria Visual ${suffix}`,
    transactionTitle: `Transação Visual ${suffix}`,
  };
};

const capture = async (page: Page, testInfo: TestInfo, name: string) => {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach(`evidence-${name}`, {
    path,
    contentType: "image/png",
  });
};

test("@visual gera evidência visual das páginas críticas", async ({ page }, testInfo) => {
  const user = buildUser();
  const appUrl = process.env.E2E_APP_URL ?? "http://localhost:5173";

  await page.goto(`${appUrl}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Login" }).waitFor();
  await capture(page, testInfo, "login");

  await page.goto(`${appUrl}/signup`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Criar conta" }).waitFor();
  await capture(page, testInfo, "cadastro");

  await page.getByLabel("Nome").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Cadastrar" }).click();

  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await capture(page, testInfo, "dashboard");

  await page.getByRole("link", { name: "Gerenciar categorias" }).click();
  await page.getByRole("heading", { name: "Categorias" }).waitFor();
  await capture(page, testInfo, "categorias");

  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome").fill(user.categoryName);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByText(user.categoryName)).toBeVisible();

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Gerenciar transações" }).click();
  await page.getByRole("heading", { name: "Transações" }).waitFor();
  await capture(page, testInfo, "transacoes");

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Meu perfil" }).click();
  await page.getByRole("heading", { name: user.name }).waitFor();
  await capture(page, testInfo, "perfil");
});
