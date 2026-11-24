import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalog, gtin13 } from "../msw/catalog";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const SHIRT = {
  name: "Camiseta Básica Branca M",
  barcode: "7891000315507",
  price: "49.90",
  stock_quantity: 10,
};
const SOCKS = {
  name: "Meia Cano Curto",
  barcode: gtin13(2),
  price: "37.70",
  stock_quantity: 10,
};

function codeInput() {
  return screen.getByRole("textbox", { name: "Código de barras" });
}

async function openNewSale(route = "/sales/new") {
  const view = renderApp(route);
  await screen.findByRole("heading", { name: "Nova venda", level: 1 });
  return view;
}

async function scan(user: User, code: string) {
  await user.type(codeInput(), `${code}{Enter}`);
}

async function cartRow(name: string) {
  const table = await screen.findByRole("table", { name: "Itens da venda" });
  const row = await waitFor(() => {
    const found = within(table)
      .getAllByRole("row")
      .find((candidate) => within(candidate).queryByText(name));
    if (!found) throw new Error(`linha de ${name} não encontrada`);
    return found;
  });
  return within(row);
}

function summary() {
  return within(screen.getByRole("region", { name: "Resumo da venda" }));
}

describe("Nova venda: leitura e carrinho (US1)", () => {
  it("FR-003: abre com o foco no código de barras", async () => {
    await openNewSale();

    expect(codeInput()).toHaveFocus();
    expect(codeInput()).toHaveAccessibleDescription(
      "Leia com o leitor ou digite e tecle Enter.",
    );
    expect(
      screen.getByText(
        "Nenhum item ainda. Leia o código de barras do primeiro produto.",
      ),
    ).toBeVisible();
  });

  it("US1-1: o código + Enter adiciona o produto e limpa o campo", async () => {
    catalog.seed(SHIRT);
    const { user } = await openNewSale();

    await scan(user, SHIRT.barcode);

    const row = await cartRow(SHIRT.name);
    expect(row.getByText(SHIRT.barcode)).toBeVisible();
    expect(
      row.getByRole("textbox", { name: `Quantidade de ${SHIRT.name}` }),
    ).toHaveValue("1");
    expect(row.getAllByText("R$ 49,90")).toHaveLength(2);
    expect(summary().getByText("R$ 49,90")).toBeVisible();
    expect(codeInput()).toHaveValue("");
    expect(codeInput()).toHaveFocus();
  });

  it("US1-2: ler de novo soma 1 na mesma linha", async () => {
    catalog.seed(SHIRT);
    const { user } = await openNewSale();

    await scan(user, SHIRT.barcode);
    await cartRow(SHIRT.name);
    await scan(user, SHIRT.barcode);

    const row = await cartRow(SHIRT.name);
    await waitFor(() =>
      expect(
        row.getByRole("textbox", { name: `Quantidade de ${SHIRT.name}` }),
      ).toHaveValue("2"),
    );
    expect(row.getByText("R$ 99,80")).toBeVisible();
    expect(summary().getByText("Itens: 2 un.")).toBeVisible();
  });

  it("US1-3: código desconhecido avisa e não muda o carrinho", async () => {
    const { user } = await openNewSale();

    await scan(user, "7890000000000");

    expect(
      await screen.findByRole("status", { name: "Leitura" }),
    ).toHaveTextContent("Produto não encontrado");
    expect(screen.queryByRole("table", { name: "Itens da venda" })).toBeNull();
    expect(codeInput()).toHaveValue("");
  });

  it("FR-007: sem estoque não entra; não passa do saldo", async () => {
    catalog.seed(
      { name: "Boné Aba Reta", barcode: gtin13(3), stock_quantity: 0 },
      { ...SOCKS, stock_quantity: 1 },
    );
    const { user } = await openNewSale();
    const reading = () => screen.getByRole("status", { name: "Leitura" });

    await scan(user, gtin13(3));
    await waitFor(() =>
      expect(reading()).toHaveTextContent("Boné Aba Reta está sem estoque"),
    );
    await scan(user, SOCKS.barcode);
    await cartRow(SOCKS.name);
    await scan(user, SOCKS.barcode);

    await waitFor(() =>
      expect(reading()).toHaveTextContent(
        "Há só 1 un. de Meia Cano Curto em estoque",
      ),
    );
    const row = await cartRow(SOCKS.name);
    expect(
      row.getByRole("textbox", { name: `Quantidade de ${SOCKS.name}` }),
    ).toHaveValue("1");
  });

  it("US1-4: busca pelo nome e adiciona o escolhido", async () => {
    catalog.seed(SHIRT, SOCKS);
    const { user } = await openNewSale();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar pelo nome" }),
      "meia",
    );
    const found = await screen.findByRole("list", {
      name: "Produtos encontrados",
    });
    await user.click(
      await within(found).findByRole("button", {
        name: `Adicionar ${SOCKS.name}`,
      }),
    );

    expect(await cartRow(SOCKS.name)).toBeTruthy();
    expect(summary().getByText("R$ 37,70")).toBeVisible();
  });

  it("US1-5: mudar a quantidade e remover recalculam o total", async () => {
    catalog.seed(SHIRT, SOCKS);
    const { user } = await openNewSale();
    await scan(user, SHIRT.barcode);
    await cartRow(SHIRT.name);
    await scan(user, SOCKS.barcode);
    const shirtRow = await cartRow(SHIRT.name);

    const quantity = shirtRow.getByRole("textbox", {
      name: `Quantidade de ${SHIRT.name}`,
    });
    await user.clear(quantity);
    await user.type(quantity, "3");

    expect(await shirtRow.findByText("R$ 149,70")).toBeVisible();
    expect(summary().getByText("R$ 187,40")).toBeVisible();
    await user.click(
      (await cartRow(SOCKS.name)).getByRole("button", {
        name: `Remover ${SOCKS.name}`,
      }),
    );
    await waitFor(() => expect(summary().getByText("R$ 149,70")).toBeVisible());
    await user.click(
      shirtRow.getByRole("button", { name: `Aumentar ${SHIRT.name}` }),
    );
    expect(quantity).toHaveValue("4");
  });

  it("FR-028: o carrinho continua depois de sair e voltar", async () => {
    catalog.seed(SHIRT);
    const first = await openNewSale();
    await scan(first.user, SHIRT.barcode);
    await cartRow(SHIRT.name);
    first.unmount();

    await openNewSale();

    expect(await cartRow(SHIRT.name)).toBeTruthy();
  });
});
