/**
 * Venda contra a stack real (frontend + API + PostgreSQL), sem simulação (spec 004,
 * RP-001, RP-006, SC-008): cadastrar e repor um produto, vendê-lo pelo código de
 * barras com Pix e dinheiro (troco), ver o comprovante, conferir a baixa no estoque e
 * a movimentação "Venda", e recarregar o histórico para provar que a venda ficou no
 * banco.
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

function section(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Seções" })
    .getByRole("link", { name, exact: true });
}

function stockRow(page: Page, name: string) {
  return page
    .getByRole("table", { name: "Estoque" })
    .getByRole("row")
    .filter({ hasText: name });
}

test("RP-001, RP-006, SC-008: venda pelo código com troco, baixa de estoque e persistência", async ({
  page,
}) => {
  const barcode = uniqueGtin13();
  const name = `Caderno E2E ${barcode.slice(-6)}`;

  // Cadastrar o produto e registrar a entrada de 10 unidades.
  await page.goto("/products");
  await page.getByRole("button", { name: "Novo produto" }).click();
  const form = page.getByRole("dialog", { name: "Novo produto" });
  await form.getByRole("textbox", { name: "Nome" }).fill(name);
  await form.getByRole("textbox", { name: "Código de barras" }).fill(barcode);
  await form.getByRole("textbox", { name: "Preço de venda" }).fill("29,90");
  await form.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByText("Produto cadastrado")).toBeVisible();

  await section(page, "Estoque").click();
  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).fill(name);
  await page
    .getByRole("button", { name: `Registrar entrada de ${name}` })
    .click();
  const entry = page.getByRole("dialog", { name: "Registrar entrada" });
  await entry.getByRole("textbox", { name: "Quantidade" }).fill("10");
  await entry.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(stockRow(page, name)).toContainText("10 un.");

  // Nova venda: duas leituras do mesmo código (US1).
  await section(page, "Nova venda").click();
  const code = page.getByRole("textbox", { name: "Código de barras" });
  await expect(code).toBeFocused();
  await code.fill(barcode);
  await code.press("Enter");
  const quantity = page.getByRole("textbox", { name: `Quantidade de ${name}` });
  await expect(quantity).toHaveValue("1");
  await code.fill(barcode);
  await code.press("Enter");
  await expect(quantity).toHaveValue("2");

  // Pix e dinheiro, com troco (US2).
  const situation = page.getByRole("status", {
    name: "Situação do pagamento",
  });
  await expect(situation).toHaveText("Falta pagar R$ 59,80");
  const amount = page.getByRole("textbox", { name: "Valor" });
  await page.getByRole("radio", { name: "Pix" }).check();
  await amount.fill("20");
  await page.getByRole("button", { name: "Adicionar pagamento" }).click();
  await expect(situation).toHaveText("Falta pagar R$ 39,80");
  await page.getByRole("radio", { name: "Dinheiro" }).check();
  await amount.fill("50");
  await page.getByRole("button", { name: "Adicionar pagamento" }).click();
  await expect(situation).toHaveText("Troco: R$ 10,20");

  // Finalizar e ler o comprovante.
  await page.getByRole("button", { name: "Finalizar venda" }).click();
  const receipt = page.getByRole("dialog", {
    name: /^Venda nº \d+ registrada$/,
  });
  await expect(receipt).toBeVisible();
  await expect(receipt).toContainText(`2 × ${name}`);
  await expect(receipt).toContainText("R$ 10,20");
  const title = await receipt.getByRole("heading").first().textContent();
  const number = title?.match(/nº (\d+)/)?.[1] ?? "";
  expect(number).not.toBe("");
  await receipt.getByRole("button", { name: "Nova venda" }).click();
  await expect(code).toBeFocused();

  // O estoque baixou 2 e o histórico mostra a venda (FR-019).
  await section(page, "Estoque").click();
  await page.getByRole("searchbox", { name: "Buscar pelo nome" }).fill(name);
  await expect(stockRow(page, name)).toContainText("8 un.");
  await page.getByRole("button", { name: `Ver histórico de ${name}` }).click();
  const latest = page
    .getByRole("dialog", { name: `Histórico de ${name}` })
    .getByRole("table", { name: "Movimentações" })
    .getByRole("row")
    .nth(1);
  await expect(latest).toContainText("Venda");
  await expect(latest).toContainText("−2");
  await expect(latest).toContainText(`Venda nº ${number}`);
  await page.keyboard.press("Escape");

  // Histórico de vendas, depois de recarregar (SC-006).
  await section(page, "Vendas").click();
  await page.reload();
  const row = page
    .getByRole("table", { name: "Vendas realizadas" })
    .getByRole("row")
    .filter({ hasText: `nº ${number}` });
  await expect(row).toContainText("2 un.");
  await expect(row).toContainText("Pix + Dinheiro");
  await expect(row).toContainText("R$ 59,80");
});
