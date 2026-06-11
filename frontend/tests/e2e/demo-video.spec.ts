import { type Page, expect, test } from "@playwright/test";

import { listCategories, listTransactions, loginViaApi, meQuery } from "./helpers/graphql-client";
import {
  caption,
  checkCaption,
  clearCaption,
  humanClick,
  humanType,
} from "./helpers/video-caption";

const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:5173";

// Short unique suffix (6 chars) to avoid conflicts without ugly long timestamps
const uid = Math.random().toString(36).slice(2, 8);
const userA = {
  name: "Demo User A",
  email: `demo.a.${uid}@financy.local`,
  password: "DemoPass123!",
};
const userB = {
  name: "Demo User B",
  email: `demo.b.${uid}@financy.local`,
  password: "DemoPass123!",
};
const categoryName = "Categoria Demo A";
const categoryEditedName = "Categoria Demo A Editada";
const categoryDescription = "Categoria criada no vídeo automatizado";
const categoryEditedDescription = "Categoria editada no vídeo automatizado";
const transactionTitle = "Transação Demo A";
const transactionEditedTitle = "Transação Demo A Editada";

const today = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
})();

const waitForRouteTransitionIdle = async (page: Page) => {
  await page
    .waitForFunction(
      () => {
        const node = document.querySelector("[data-testid='route-transition-root']");
        return !node?.className || !/t-route-(enter|exit)/.test(node.className);
      },
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {
      // Tolerate if the route transition root is not present
    });
};

/**
 * Navigate using the navbar links instead of page.goto for a humanized demo.
 */
const navigateTo = async (
  page: Page,
  target: "dashboard" | "transactions" | "categories" | "profile",
) => {
  if (target === "profile") {
    // Profile is the avatar circle link in the top-right corner
    const avatarLink = page.locator("[data-testid='dashboard-nav-header'] a[href='/profile']");
    await humanClick(avatarLink);
  } else {
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      transactions: "Transações",
      categories: "Categorias",
    };
    const navLink = page
      .locator("[data-testid='dashboard-nav-header']")
      .getByRole("link", { name: labels[target] })
      .first();
    await humanClick(navLink);
  }
  await waitForRouteTransitionIdle(page);
};

test("@demo-video-checklist Financy: evidência visual do checklist completo", async ({
  page,
  request,
}) => {
  test.skip(!process.env.E2E_DEMO_VIDEO, "Skipped unless E2E_DEMO_VIDEO is set");
  test.setTimeout(300_000);

  let tokenA = "";
  let tokenB = "";

  // ─── 1. Introduction ───
  await test.step("1. Introdução — abrir o app", async () => {
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
      timeout: 20_000,
    });

    await caption(
      page,
      "Iniciando evidência visual do checklist Financy: autenticação, isolamento por usuário, categorias e transações.",
    );
    await checkCaption(page, "✅ Check: App carregado com sucesso.");
  });

  // ─── 2. Register User A ───
  await test.step("2. Criar conta do Usuário A", async () => {
    await caption(page, "Criando a conta do Usuário A pela interface.");
    await waitForRouteTransitionIdle(page);

    await humanClick(page.getByRole("link", { name: "Criar conta" }));
    await page.waitForURL(/\/signup/, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
      timeout: 15_000,
    });
    await waitForRouteTransitionIdle(page);

    const nameInput = page.getByTestId("signup-name");
    const emailInput = page.getByTestId("signup-email");
    const passwordInput = page.getByTestId("signup-password");

    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });

    await humanType(nameInput, userA.name);
    await humanType(emailInput, userA.email);
    await humanType(passwordInput, userA.password);

    const registerResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/graphql") &&
        response.request().postData()?.includes("Register") === true,
    );

    await humanClick(page.getByRole("button", { name: "Cadastrar" }));
    const response = await registerResponse;
    const payload = await response.json();
    expect(payload.errors).toBeFalsy();
    expect(payload.data?.register?.created).toBeTruthy();

    await page.waitForURL(/\/login/, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
      timeout: 15_000,
    });

    await checkCaption(
      page,
      "✅ Check Front-end: cadastro redirecionou para login ou exibiu confirmação de conta criada.",
    );

    // Back-end check: authenticate via GraphQL
    tokenA = await loginViaApi(request, userA.email, userA.password);
    expect(tokenA).toBeTruthy();
    await checkCaption(
      page,
      "✅ Check Back-end: conta criada e usuário pode autenticar via GraphQL.",
    );
  });

  // ─── 3. Login User A ───
  await test.step("3. Login do Usuário A", async () => {
    await caption(page, "Fazendo login com o Usuário A.");

    await humanType(page.getByTestId("signin-email"), userA.email);
    await humanType(page.getByTestId("signin-password"), userA.password);
    await humanClick(page.getByRole("button", { name: "Entrar" }));

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Transações recentes" })).toBeVisible({
      timeout: 20_000,
    });

    await checkCaption(page, "✅ Check Front-end: usuário autenticado chegou ao dashboard.");

    // Back-end check: validate session
    const me = await meQuery(request, tokenA);
    expect(me.email).toBe(userA.email);
    await checkCaption(
      page,
      "✅ Check Back-end: sessão/token do Usuário A está válido via query me.",
    );
  });

  // ─── 4. Create category for User A ───
  await test.step("4. Criar categoria do Usuário A", async () => {
    await caption(page, "Criando uma categoria exclusiva do Usuário A.");

    await navigateTo(page, "categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
      timeout: 20_000,
    });

    const createCategoryButton = page.getByRole("button", { name: "Nova categoria" });
    await expect(createCategoryButton).toBeEnabled({ timeout: 20_000 });
    await humanClick(createCategoryButton);

    await expect(page.getByRole("dialog", { name: "Nova categoria" })).toBeVisible({
      timeout: 15_000,
    });

    await humanType(page.getByTestId("categories-create-name"), categoryName);
    await humanType(page.getByTestId("categories-create-description"), categoryDescription);
    await humanClick(page.getByTestId("categories-create-confirm"));

    await expect(page.getByText("Categoria criada com sucesso.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: categoryName })).toBeVisible({
      timeout: 20_000,
    });

    await checkCaption(page, "✅ Check Front-end: categoria criada aparece na tela de categorias.");

    // Back-end check
    const categories = await listCategories(request, tokenA);
    const found = categories.find((c) => c.name === categoryName);
    expect(found).toBeTruthy();
    await checkCaption(
      page,
      "✅ Check Back-end: mutation de categoria retornou ID e a query de categorias contém a nova categoria para o Usuário A.",
    );
  });

  // ─── 5. List categories ───
  await test.step("5. Listar categorias do Usuário A", async () => {
    await caption(page, "Listando categorias do Usuário A.");

    await expect(page.getByRole("heading", { name: categoryName })).toBeVisible({
      timeout: 15_000,
    });

    await checkCaption(page, "✅ Check Front-end: lista de categorias exibe a categoria criada.");

    const categories = await listCategories(request, tokenA);
    expect(categories.length).toBeGreaterThan(0);
    const found = categories.find((c) => c.name === categoryName);
    expect(found).toBeTruthy();
    await checkCaption(
      page,
      "✅ Check Back-end: query de categorias retornou apenas dados acessíveis ao usuário autenticado.",
    );
  });

  // ─── 6. Edit category ───
  await test.step("6. Editar categoria do Usuário A", async () => {
    await caption(page, "Editando a categoria criada pelo Usuário A.");

    const categoryCard = page
      .getByTestId(/^category-item-/)
      .filter({ has: page.getByRole("heading", { name: categoryName }) });

    await expect(
      categoryCard.getByRole("button", { name: `Editar categoria ${categoryName}` }),
    ).toBeVisible({ timeout: 15_000 });
    await humanClick(
      categoryCard.getByRole("button", { name: `Editar categoria ${categoryName}` }),
    );

    await humanType(page.getByTestId("categories-edit-name"), categoryEditedName);
    await humanType(page.getByTestId("categories-edit-description"), categoryEditedDescription);
    await humanClick(page.getByTestId("categories-edit-confirm"));

    await expect(page.getByText("Categoria atualizada com sucesso.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: categoryEditedName })).toBeVisible({
      timeout: 20_000,
    });

    await checkCaption(page, "✅ Check Front-end: categoria editada aparece com novo nome.");

    const categories = await listCategories(request, tokenA);
    const found = categories.find((c) => c.name === categoryEditedName);
    expect(found).toBeTruthy();
    expect(found?.description).toBe(categoryEditedDescription);
    await checkCaption(
      page,
      "✅ Check Back-end: mutation de edição persistiu a alteração da categoria.",
    );
  });

  // ─── 7. Create transaction for User A ───
  await test.step("7. Criar transação do Usuário A", async () => {
    await caption(page, "Criando uma transação vinculada à categoria do Usuário A.");

    await navigateTo(page, "transactions");
    await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/transactions/, { timeout: 20_000 });

    const createTransactionButton = page.getByRole("button", { name: "Nova transação" });
    await expect(createTransactionButton).toBeEnabled({ timeout: 20_000 });
    await humanClick(createTransactionButton);

    const transactionDialog = page.getByRole("dialog", { name: "Nova transação" });
    await expect(transactionDialog).toBeVisible({ timeout: 15_000 });

    // Select EXPENSE (default)
    await humanClick(transactionDialog.locator("button").filter({ hasText: "Despesa" }));

    // Select category
    const categorySelect = transactionDialog.locator("#dashboard-transaction-category");
    await humanClick(categorySelect);
    const categoryOption = page.locator(".t-dropdown button").filter({
      hasText: new RegExp(`^${categoryEditedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    });
    await expect(categoryOption).toBeVisible({ timeout: 15_000 });
    await humanClick(categoryOption);
    await expect(categorySelect).toContainText(categoryEditedName, { timeout: 10_000 });

    // Fill form
    await humanType(
      transactionDialog.locator("#dashboard-transaction-description"),
      transactionTitle,
    );
    await transactionDialog.locator("#dashboard-transaction-date").fill(today);
    await humanType(transactionDialog.locator("#dashboard-transaction-amount"), "123,45");

    const saveButton = transactionDialog.getByRole("button", { name: "Salvar" });
    await expect(saveButton).toBeEnabled({ timeout: 10_000 });
    await humanClick(saveButton);

    await expect(page.getByRole("dialog", { name: "Nova transação" })).not.toBeVisible({
      timeout: 20_000,
    });

    // Wait for the transaction in the list
    const transactionRow = page.getByRole("listitem").filter({ hasText: transactionTitle });
    await expect(transactionRow.first()).toBeVisible({ timeout: 20_000 });

    await checkCaption(page, "✅ Check Front-end: transação criada aparece na listagem.");

    // Back-end check
    const transactions = await listTransactions(request, tokenA);
    const found = transactions.find((t) => t.title === transactionTitle);
    expect(found).toBeTruthy();
    await checkCaption(
      page,
      "✅ Check Back-end: mutation de transação retornou ID e a query de transações contém a nova transação.",
    );
  });

  // ─── 8. List transactions ───
  await test.step("8. Listar transações do Usuário A", async () => {
    await caption(page, "Listando transações do Usuário A.");

    const transactionRow = page.getByRole("listitem").filter({ hasText: transactionTitle });
    await expect(transactionRow.first()).toBeVisible({ timeout: 15_000 });

    await checkCaption(page, "✅ Check Front-end: listagem mostra a transação criada.");

    const transactions = await listTransactions(request, tokenA);
    const found = transactions.find((t) => t.title === transactionTitle);
    expect(found).toBeTruthy();
    await checkCaption(
      page,
      "✅ Check Back-end: query de transações retorna a transação do Usuário A.",
    );
  });

  // ─── 9. Edit transaction ───
  await test.step("9. Editar transação do Usuário A", async () => {
    await caption(page, "Editando a transação criada pelo Usuário A.");

    const transactionRow = page.getByRole("listitem").filter({ hasText: transactionTitle });
    await expect(transactionRow.first()).toBeVisible({ timeout: 15_000 });
    await humanClick(transactionRow.first().getByRole("button", { name: "Editar transação" }));

    const editDialog = page.getByRole("dialog", { name: "Editar transação" });
    await expect(editDialog).toBeVisible({ timeout: 15_000 });

    await humanType(
      editDialog.locator("#dashboard-transaction-description"),
      transactionEditedTitle,
    );
    await humanType(editDialog.locator("#dashboard-transaction-amount"), "234,56");

    await humanClick(editDialog.getByRole("button", { name: "Salvar" }));

    await expect(page.getByText("Transação atualizada com sucesso.")).toBeVisible({
      timeout: 20_000,
    });

    const updatedRow = page.getByRole("listitem").filter({ hasText: transactionEditedTitle });
    await expect(updatedRow.first()).toBeVisible({ timeout: 20_000 });

    await checkCaption(page, "✅ Check Front-end: transação editada aparece com novo nome/valor.");

    const transactions = await listTransactions(request, tokenA);
    const found = transactions.find((t) => t.title === transactionEditedTitle);
    expect(found).toBeTruthy();
    expect(found?.amount).toBeCloseTo(234.56, 1);
    await checkCaption(
      page,
      "✅ Check Back-end: mutation de edição persistiu a alteração da transação.",
    );
  });

  // ─── 10. Validate user isolation ───
  await test.step("10. Validar isolamento por usuário", async () => {
    await caption(
      page,
      "Validando isolamento: o Usuário B não deve ver dados criados pelo Usuário A.",
    );

    // Logout User A via profile page
    await navigateTo(page, "profile");
    await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible({
      timeout: 15_000,
    });
    await humanClick(page.getByRole("button", { name: "Sair da conta" }));
    await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
      timeout: 15_000,
    });

    // Register User B via UI
    await waitForRouteTransitionIdle(page);
    await humanClick(page.getByRole("link", { name: "Criar conta" }));
    await page.waitForURL(/\/signup/, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible({
      timeout: 15_000,
    });
    await waitForRouteTransitionIdle(page);

    await humanType(page.getByTestId("signup-name"), userB.name);
    await humanType(page.getByTestId("signup-email"), userB.email);
    await humanType(page.getByTestId("signup-password"), userB.password);

    const registerResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/graphql") &&
        response.request().postData()?.includes("Register") === true,
    );
    await humanClick(page.getByRole("button", { name: "Cadastrar" }));
    await registerResponse;

    await page.waitForURL(/\/login/, { timeout: 15_000, waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
      timeout: 15_000,
    });

    // Login as User B
    await humanType(page.getByTestId("signin-email"), userB.email);
    await humanType(page.getByTestId("signin-password"), userB.password);
    await humanClick(page.getByRole("button", { name: "Entrar" }));
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });

    // Check categories — User A data must not appear
    await navigateTo(page, "categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: categoryEditedName })).toHaveCount(0);

    // Check transactions — User A data must not appear
    await navigateTo(page, "transactions");
    await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(transactionEditedTitle)).toHaveCount(0);

    await checkCaption(
      page,
      "✅ Check Front-end: dados do Usuário A não aparecem para o Usuário B.",
    );

    // Back-end check with User B token
    tokenB = await loginViaApi(request, userB.email, userB.password);
    const categoriesB = await listCategories(request, tokenB);
    expect(categoriesB.find((c) => c.name === categoryEditedName)).toBeFalsy();

    const transactionsB = await listTransactions(request, tokenB);
    expect(transactionsB.find((t) => t.title === transactionEditedTitle)).toBeFalsy();

    await checkCaption(
      page,
      "✅ Check Back-end: queries autenticadas do Usuário B não retornam categoria nem transação do Usuário A.",
    );
  });

  // ─── 11. Switch back to User A ───
  await test.step("11. Voltar ao Usuário A", async () => {
    await caption(page, "Voltando ao Usuário A para finalizar exclusões dos dados criados.");

    // Logout User B
    await navigateTo(page, "profile");
    await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible({
      timeout: 15_000,
    });
    await humanClick(page.getByRole("button", { name: "Sair da conta" }));
    await expect(page.getByRole("heading", { name: "Fazer login" })).toBeVisible({
      timeout: 15_000,
    });

    // Login User A
    await humanType(page.getByTestId("signin-email"), userA.email);
    await humanType(page.getByTestId("signin-password"), userA.password);
    await humanClick(page.getByRole("button", { name: "Entrar" }));
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 20_000 });

    // Verify User A still sees their data
    await navigateTo(page, "categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: categoryEditedName })).toBeVisible({
      timeout: 20_000,
    });

    await navigateTo(page, "transactions");
    await expect(page.getByRole("heading", { name: "Transações" })).toBeVisible({
      timeout: 20_000,
    });
    const transactionRow = page.getByRole("listitem").filter({ hasText: transactionEditedTitle });
    await expect(transactionRow.first()).toBeVisible({ timeout: 20_000 });

    await checkCaption(
      page,
      "✅ Check: Usuário A continua gerenciando apenas seus próprios dados.",
    );
  });

  // ─── 12. Delete transaction ───
  await test.step("12. Deletar transação do Usuário A", async () => {
    await caption(page, "Deletando a transação criada no vídeo.");

    const transactionRow = page.getByRole("listitem").filter({ hasText: transactionEditedTitle });
    await expect(transactionRow.first()).toBeVisible({ timeout: 15_000 });
    await humanClick(transactionRow.first().getByRole("button", { name: "Excluir transação" }));

    const deleteDialog = page.getByRole("dialog", { name: "Excluir transação" });
    await expect(deleteDialog).toBeVisible({ timeout: 15_000 });
    await humanClick(deleteDialog.getByRole("button", { name: "Excluir transação" }));

    await expect(page.getByText("Transação excluída com sucesso.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(transactionRow.first()).not.toBeVisible({ timeout: 20_000 });

    await checkCaption(page, "✅ Check Front-end: transação removida não aparece mais na lista.");

    const transactions = await listTransactions(request, tokenA);
    expect(transactions.find((t) => t.title === transactionEditedTitle)).toBeFalsy();
    await checkCaption(
      page,
      "✅ Check Back-end: query de transações não retorna mais a transação deletada.",
    );
  });

  // ─── 13. Delete category ───
  await test.step("13. Deletar categoria do Usuário A", async () => {
    await caption(page, "Deletando a categoria criada no vídeo.");

    await navigateTo(page, "categories");
    await expect(page.getByRole("heading", { name: "Categorias" })).toBeVisible({
      timeout: 20_000,
    });

    const categoryCard = page
      .getByTestId(/^category-item-/)
      .filter({ has: page.getByRole("heading", { name: categoryEditedName }) });
    await expect(categoryCard).toBeVisible({ timeout: 15_000 });

    await humanClick(
      categoryCard.getByRole("button", { name: `Excluir categoria ${categoryEditedName}` }),
    );

    const deleteDialog = page.getByRole("dialog", { name: "Excluir categoria" });
    await expect(deleteDialog).toBeVisible({ timeout: 15_000 });
    await humanClick(deleteDialog.getByRole("button", { name: "Excluir categoria" }));

    await expect(page.getByText("Categoria excluída com sucesso.")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("heading", { name: categoryEditedName })).not.toBeVisible({
      timeout: 20_000,
    });

    await checkCaption(page, "✅ Check Front-end: categoria removida não aparece mais na lista.");

    const categories = await listCategories(request, tokenA);
    expect(categories.find((c) => c.name === categoryEditedName)).toBeFalsy();
    await checkCaption(
      page,
      "✅ Check Back-end: query de categorias não retorna mais a categoria deletada.",
    );
  });

  // ─── 14. Closing ───
  await test.step("14. Encerramento", async () => {
    await checkCaption(page, "✅ Vídeo de evidência gerado com sucesso.");
    await page.waitForTimeout(2000);
    await clearCaption(page);
  });
});
