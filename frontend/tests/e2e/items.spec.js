import { expect, test } from "@playwright/test";

// Sem mocks: navegador → React → FastAPI → PostgreSQL. Nomes únicos por execução,
// para o teste não depender dos dados que já estão no banco.
function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

test("carrega a interface e a lista vinda da API", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Gerenciador de Itens" }),
  ).toBeVisible();
  await expect(page.getByText("Carregando itens...")).toBeHidden();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("cadastra um item e ele persiste após recarregar a página", async ({
  page,
}) => {
  const name = uniqueName("Notebook");
  await page.goto("/");

  await page.getByLabel("Nome").fill(name);
  await page.getByLabel("Descrição").fill("14 polegadas");
  await page.getByRole("button", { name: "Adicionar" }).click();

  const item = page.getByRole("listitem").filter({ hasText: name });
  await expect(item).toBeVisible();
  await expect(item).toContainText("14 polegadas");

  await page.reload();
  await expect(item).toBeVisible(); // veio do PostgreSQL
});

test("mostra a mensagem da API ao repetir um nome", async ({ page }) => {
  const name = uniqueName("Mouse");
  await page.goto("/");

  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: name }),
  ).toBeVisible();

  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Adicionar" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Já existe um item com esse nome",
  );
  await expect(page.getByLabel("Nome")).toHaveValue(name);
  await expect(
    page.getByRole("listitem").filter({ hasText: name }),
  ).toHaveCount(1);
});

test("mostra erro ao enviar nome vazio", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Adicionar" }).click();

  await expect(page.getByRole("alert")).toHaveText("O nome é obrigatório.");
});
