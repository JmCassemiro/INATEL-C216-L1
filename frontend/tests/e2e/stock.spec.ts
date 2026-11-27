/**
 * Fluxo do estoque contra a stack real (frontend + API + PostgreSQL), sem simulação
 * (spec 011, RP-006, SC-008): cadastrar com estoque mínimo, ver o produto na lista de
 * reposição, registrar uma entrada e um ajuste, recarregar a página para provar que o
 * saldo ficou no banco e conferir o histórico.
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

function stockRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Estoque" })
    .getByRole("row")
    .filter({ hasText: name });
}

test("RP-001, RP-006, SC-008: reposição, entrada e ajuste pela interface, com persistência", async ({
  page,
}) => {
  const barcode = uniqueGtin13();
  const name = `Água E2E ${barcode.slice(-6)}`;

  // Cadastrar o produto com estoque mínimo 30 (FR-012).
  await page.goto("/products");
  await page.getByRole("button", { name: "Novo produto" }).click();
  const form = page.getByRole("dialog", { name: "Novo produto" });
  await form.getByRole("textbox", { name: "Nome" }).fill(name);
  await form.getByRole("textbox", { name: "Código de barras" }).fill(barcode);
  await form.getByRole("textbox", { name: "Preço de venda" }).fill("2,50");
  await form
    .getByRole("textbox", { name: "Estoque mínimo (opcional)" })
    .fill("30");
  await form.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByText("Produto cadastrado")).toBeVisible();

  // Seção Estoque, visão "Para repor" (US2): saldo 0, abaixo do mínimo.
  await page
    .getByRole("navigation", { name: "Seções" })
    .getByRole("link", { name: "Estoque" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Estoque" }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Mostrar" })
    .getByRole("button", { name: "Para repor" })
    .click();
  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).fill(name);
  await expect(page).toHaveURL(/view=restock/);
  await expect(stockRow(page, name)).toContainText("Sem estoque");

  // Registrar a entrada (US1).
  await page
    .getByRole("button", { name: `Registrar entrada de ${name}` })
    .click();
  const entry = page.getByRole("dialog", { name: "Registrar entrada" });
  await entry.getByRole("textbox", { name: "Quantidade" }).fill("24");
  await entry
    .getByRole("textbox", { name: "Observação (opcional)" })
    .fill("NF 1234");
  await entry.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(
    page.getByText(`Entrada registrada: ${name} agora tem 24 un.`),
  ).toBeVisible();
  await expect(stockRow(page, name)).toContainText("Repor · faltam 6");

  // Ajustar com motivo (US3), conferindo a prévia.
  await page
    .getByRole("button", { name: `Ajustar estoque de ${name}` })
    .click();
  const adjustment = page.getByRole("dialog", { name: "Ajustar estoque" });
  await adjustment.getByRole("textbox", { name: "Quantidade" }).fill("2");
  await expect(adjustment.getByRole("status")).toHaveText("Saldo: 24 → 22");
  await adjustment
    .getByRole("textbox", { name: "Motivo" })
    .fill("Avaria no transporte");
  await adjustment.getByRole("button", { name: "Salvar ajuste" }).click();
  await expect(
    page.getByText(`Ajuste salvo: ${name} agora tem 22 un.`),
  ).toBeVisible();

  // Recarregar: o saldo veio do banco (SC-005).
  await page.reload();
  const row = stockRow(page, name);
  await expect(row).toContainText("22 un.");
  await expect(row).toContainText("Repor · faltam 8");

  // Histórico (US4): as duas movimentações, da mais recente para a mais antiga.
  await page.getByRole("button", { name: `Ver histórico de ${name}` }).click();
  const history = page.getByRole("dialog", { name: `Histórico de ${name}` });
  const movements = history
    .getByRole("table", { name: "Movimentações" })
    .getByRole("row");
  await expect(movements).toHaveCount(3);
  await expect(movements.nth(1)).toContainText("−2");
  await expect(movements.nth(1)).toContainText("Avaria no transporte");
  await expect(movements.nth(2)).toContainText("+24");
  await expect(movements.nth(2)).toContainText("NF 1234");
});
