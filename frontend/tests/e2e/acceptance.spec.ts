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
    transactionTitle: `Transacao E2E ${suffix}`,
  };
};

const toDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const registerUser = async (
  graphqlUrl: string,
  input: { name: string; email: string; password: string },
) => {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            token
            user {
              id
            }
          }
        }
      `,
      variables: {
        input,
      },
    }),
  });

  const payload = (await response.json()) as {
    data?: { register?: { token?: string } };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.errors?.length || !payload.data?.register?.token) {
    throw new Error(`User registration failed: ${JSON.stringify(payload.errors ?? payload)}`);
  }
};

test("@smoke fluxo ponta a ponta de auth, categorias, transacoes e perfil", async ({ page }) => {
  const user = buildUser();
  const appUrl = process.env.E2E_APP_URL ?? "http://localhost:5173";
  const apiUrl = process.env.E2E_API_URL ?? "http://localhost:4000/graphql";

  await registerUser(apiUrl, {
    name: user.name,
    email: user.email,
    password: user.password,
  });

  await page.goto(`${appUrl}/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Login" }).waitFor();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Senha").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

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
  await page.goto(`${appUrl}/categories`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Login" }).waitFor();
});
