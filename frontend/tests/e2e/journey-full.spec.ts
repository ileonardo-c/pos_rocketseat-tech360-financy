import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { buildSeedE2EUser } from "./support/e2e-users";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";

const waitForTransactionInPages = async (page, title) => {
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row.first()).toBeVisible({ timeout: 20_000 });
  return row.first();
};

const findTransactionRowInPages = (page, title) =>
  page.getByRole("listitem").filter({ hasText: title });

const today = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
})();

const fallbackAvatar = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAACEN9P7AAAAF0lEQVR42mNk+M9QzwAEYBxVSFQAZYAAAOQAFW9hEJYAAAAAElFTkSuQmCC",
  "base64",
);

const resolveSeedAvatarPayload = () => {
  const envPath = process.env.E2E_SEED_AVATAR_PATH?.trim();
  if (envPath && existsSync(path.resolve(envPath))) {
    const resolved = path.resolve(envPath);
    const fileName = path.basename(resolved);
    const buffer = readFileSync(resolved);
    return {
      name: fileName,
      mimeType: "image/png",
      buffer,
    };
  }

  return {
    name: "seed-avatar.png",
    mimeType: "image/png",
    buffer: fallbackAvatar,
  };
};

test("@journey-full fluxo completo com conta seed e foto", async ({ page }) => {
  const seedUser = buildSeedE2EUser();
  const updatedName = `${seedUser.name} ${Date.now()}`;
  const categoryName = `AAA Categoria Seed ${Date.now()}`;
  const transactionCategoryName = "Alimentação";
  const transactionTitle = `Transação Seed ${Date.now()}`;

  await page.context().clearCookies();
  await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.getByRole("heading", { name: "Fazer login" }).waitFor();

  await page.getByTestId("signin-email").fill(seedUser.email);
  await page.getByTestId("signin-password").fill(seedUser.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Transações recentes")).toBeVisible({ timeout: 20_000 });

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Categorias" }).waitFor();
  const createCategoryButton = page.getByRole("button", { name: "Nova categoria" });
  await expect(createCategoryButton).toBeEnabled({ timeout: 20_000 });
  await createCategoryButton.click();
  await expect(page.getByRole("dialog", { name: "Nova categoria" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("categories-create-name").fill(categoryName);
  await page.getByTestId("categories-create-confirm").click();
  await expect(page.getByText("Categoria criada com sucesso.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: categoryName })).toBeVisible({
    timeout: 20_000,
  });
  const updatedCategoryName = `${categoryName} Editada`;
  const createdCategoryCard = page
    .getByTestId(/^category-item-/)
    .filter({ has: page.getByRole("heading", { name: categoryName }) });
  await expect(
    createdCategoryCard.getByRole("button", { name: `Editar categoria ${categoryName}` }),
  ).toBeVisible({ timeout: 20_000 });
  await createdCategoryCard
    .getByRole("button", { name: `Editar categoria ${categoryName}` })
    .click();
  await page.getByTestId("categories-edit-name").fill(updatedCategoryName);
  await page.getByTestId("categories-edit-confirm").click();
  await expect(page.getByText("Categoria atualizada com sucesso.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: updatedCategoryName })).toBeVisible({
    timeout: 20_000,
  });
  const updatedCategoryCard = page
    .getByTestId(/^category-item-/)
    .filter({ has: page.getByRole("heading", { name: updatedCategoryName }) });
  await expect(
    updatedCategoryCard.getByRole("button", { name: `Excluir categoria ${updatedCategoryName}` }),
  ).toBeVisible({ timeout: 20_000 });

  await page.goto(`${APP_URL}/transactions`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).toHaveURL(/\/transactions\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/, {
    timeout: 20_000,
  });
  await expect(page.getByText(/\d+ a \d+ \| \d+ resultados/)).toBeVisible({
    timeout: 20_000,
  });
  const createTransactionButton = page.getByRole("button", { name: "Nova transação" });
  await expect(createTransactionButton).toBeEnabled({ timeout: 20_000 });
  await createTransactionButton.click();
  const transactionDialog = page.getByRole("dialog", { name: "Nova transação" });
  await expect(transactionDialog).toBeVisible({ timeout: 20_000 });

  const transactionCategorySelect = transactionDialog.locator("#dashboard-transaction-category");
  await transactionCategorySelect.click();
  const transactionCategoryOption = page
    .locator(".t-dropdown button")
    .filter({ hasText: new RegExp(`^${transactionCategoryName}$`) });
  await expect(transactionCategoryOption).toBeVisible({ timeout: 20_000 });
  await transactionCategoryOption.click();
  await expect(transactionCategorySelect).toContainText(transactionCategoryName, {
    timeout: 20_000,
  });
  await transactionDialog.locator("#dashboard-transaction-description").fill(transactionTitle);
  await transactionDialog.locator("#dashboard-transaction-date").fill(today);
  await transactionDialog.locator("#dashboard-transaction-amount").fill("120,50");
  await expect(transactionDialog.locator("#dashboard-transaction-description")).toHaveValue(
    transactionTitle,
  );
  await expect(transactionDialog.locator("#dashboard-transaction-date")).toHaveValue(today);
  await expect(transactionDialog.locator("#dashboard-transaction-amount")).toHaveValue("120,50");
  const saveTransactionButton = transactionDialog.getByRole("button", { name: "Salvar" });
  await expect(saveTransactionButton).toBeEnabled({ timeout: 20_000 });
  await saveTransactionButton.click();

  await expect(page.getByRole("heading", { name: "Nova transação" })).not.toBeVisible({
    timeout: 20_000,
  });

  const transactionRow = await waitForTransactionInPages(page, transactionTitle);
  const transactionUpdatedTitle = `${transactionTitle} Editada`;
  if (!(await transactionRow.count())) return;
  await transactionRow.getByRole("button", { name: "Editar transação" }).click();
  const transactionDialogEdit = page.getByRole("dialog", { name: "Editar transação" });
  await expect(transactionDialogEdit).toBeVisible({ timeout: 20_000 });
  await transactionDialogEdit
    .locator("#dashboard-transaction-description")
    .fill(transactionUpdatedTitle);
  await transactionDialogEdit.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Transação atualizada com sucesso.")).toBeVisible({
    timeout: 20_000,
  });
  const updatedTransactionRow = await findTransactionRowInPages(page, transactionUpdatedTitle);
  await expect(updatedTransactionRow).toBeVisible({ timeout: 20_000 });
  await updatedTransactionRow.getByRole("button", { name: "Excluir transação" }).click();
  const deleteTransactionDialog = page.getByRole("dialog", { name: "Excluir transação" });
  await expect(deleteTransactionDialog).toBeVisible({ timeout: 20_000 });
  await deleteTransactionDialog.getByRole("button", { name: "Excluir transação" }).click();
  await expect(page.getByText("Transação excluída com sucesso.")).toBeVisible({ timeout: 20_000 });
  await expect(updatedTransactionRow).not.toBeVisible({ timeout: 20_000 });

  await page.goto(`${APP_URL}/categories`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Categorias" }).waitFor();
  const categoryCardBeforeDelete = page
    .getByTestId(/^category-item-/)
    .filter({ has: page.getByRole("heading", { name: updatedCategoryName }) });
  await expect(categoryCardBeforeDelete).toBeVisible({ timeout: 20_000 });
  await categoryCardBeforeDelete
    .getByRole("button", { name: `Excluir categoria ${updatedCategoryName}` })
    .click();
  const deleteCategoryDialog = page.getByRole("dialog", { name: "Excluir categoria" });
  await expect(deleteCategoryDialog).toBeVisible({ timeout: 20_000 });
  await deleteCategoryDialog.getByRole("button", { name: "Excluir categoria" }).click();
  await expect(page.getByText("Categoria excluída com sucesso.")).toBeVisible({ timeout: 20_000 });
  await expect(updatedCategoryCard).not.toBeVisible({ timeout: 20_000 });

  await page.goto(`${APP_URL}/profile`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Nome completo").fill(updatedName);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Perfil atualizado com sucesso.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(updatedName)).toBeVisible({ timeout: 20_000 });

  const avatarPayload = resolveSeedAvatarPayload();
  await page.locator("input[type='file']").setInputFiles([avatarPayload]);
  await expect(page.getByText("Foto de perfil atualizada com sucesso.")).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Remover foto" }).click();
  const removeDialog = page.getByRole("dialog", { name: "Remover foto de perfil" });
  await expect(removeDialog).toBeVisible({ timeout: 20_000 });
  await removeDialog.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByText("Foto de perfil removida com sucesso.")).toBeVisible({
    timeout: 20_000,
  });
});
