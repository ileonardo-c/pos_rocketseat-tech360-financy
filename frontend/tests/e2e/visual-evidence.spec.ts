import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { buildTransientE2EUser } from "./support/e2e-users";

test.describe.skip("Temporarily disabled: only style-guide E2E is active", () => {

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
  const user = buildTransientE2EUser();
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
  await page.getByRole("heading", { name: "Nova categoria" }).waitFor();
  await capture(page, testInfo, "categorias-nova-categoria");
  await page.getByLabel("Nome").fill(user.categoryName);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByText(user.categoryName)).toBeVisible();

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Gerenciar transações" }).click();
  await page.getByRole("heading", { name: "Transações" }).waitFor();
  await capture(page, testInfo, "transacoes");

  await page.getByRole("button", { name: "Nova transação" }).click();
  await page.getByRole("heading", { name: "Nova transação" }).waitFor();
  await capture(page, testInfo, "transacoes-nova-transacao");
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("link", { name: "Voltar" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.getByRole("link", { name: "Meu perfil" }).click();
  await page.getByRole("heading", { name: user.name }).waitFor();
  await capture(page, testInfo, "perfil");

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${appUrl}/style-guide`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("style-guide-page").waitFor();
  await capture(page, testInfo, "style-guide-desktop");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${appUrl}/style-guide`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("style-guide-page").waitFor();
  await capture(page, testInfo, "style-guide-mobile");
});

});
