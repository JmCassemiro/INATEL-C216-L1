/**
 * Fluxo completo do painel contra a stack real (frontend + API + PostgreSQL), sem
 * simulação: `make e2e` sobe uma stack isolada e apaga tudo no fim (research D13).
 * Cada etapa recarrega a página para provar que o dado ficou no banco (SC-004).
 */
import { expect, type Page, test } from "@playwright/test";

/** GTIN-13 único por execução: prefixo 2 (uso interno da loja) + relógio + dígito verificador. */
function uniqueGtin13(): string {
  const body = `2${String(Date.now()).slice(-11)}`;
  const sum = [...body]
    .reverse()
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return `${body}${(10 - (sum % 10)) % 10}`;
}

function productRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Produtos" })
    .getByRole("row")
    .filter({ hasText: name });
}

test("RP-001, RP-005, SC-008: cadastrar, buscar, editar e remover pela interface, com persistência", async ({
  page,
}) => {
  const barcode = uniqueGtin13();
  const name = `Camiseta E2E ${barcode.slice(-6)}`;

  // Abrir o painel: / leva a /products.
  await page.goto("/");
  await expect(page).toHaveURL(/\/products$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Produtos" }),
  ).toBeVisible();

  // Cadastrar (US2).
  await page.getByRole("button", { name: "Novo produto" }).click();
  const createForm = page.getByRole("dialog", { name: "Novo produto" });
  await createForm.getByRole("textbox", { name: "Nome" }).fill(name);
  await createForm
    .getByRole("textbox", { name: "Código de barras" })
    .fill(barcode);
  await createForm
    .getByRole("textbox", { name: "Preço de venda" })
    .fill("49,90");
  await expect(
    createForm.getByRole("img", { name: `Código de barras ${barcode}` }),
  ).toBeVisible();
  await createForm.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByText("Produto cadastrado")).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Produtos" }).getByRole("row").nth(1),
  ).toContainText(name);

  // Recarregar: o produto continua lá.
  await page.reload();
  await expect(productRow(page, name)).toContainText("R$ 49,90");

  // Buscar pelo nome (US1): a busca vai para a URL.
  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).fill(name);
  await expect(page).toHaveURL(/search=/);
  await expect(page.getByText("1 produto encontrado")).toBeVisible();

  // Editar o preço (US3) e recarregar.
  await page.getByRole("button", { name: `Editar ${name}` }).click();
  const editForm = page.getByRole("dialog", { name: "Editar produto" });
  await editForm.getByRole("textbox", { name: "Preço de venda" }).fill("54,90");
  await editForm.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas")).toBeVisible();
  await page.reload();
  await expect(productRow(page, name)).toContainText("R$ 54,90");

  // Remover com confirmação (US4) e recarregar: o produto não volta.
  await page.getByRole("button", { name: `Remover ${name}` }).click();
  const confirm = page.getByRole("alertdialog", { name: `Remover ${name}?` });
  await expect(confirm).toContainText(barcode);
  await confirm.getByRole("button", { name: "Remover produto" }).click();
  await expect(page.getByText("Produto removido")).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Nenhum produto com “${name}”.`)).toBeVisible();
});
