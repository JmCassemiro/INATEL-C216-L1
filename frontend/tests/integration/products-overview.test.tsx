import { screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

function seedClothes() {
  catalog.seed(
    {
      name: "Camiseta Básica Branca M",
      barcode: "7891000315507",
      price: "49.90",
    },
    { name: "Calça Jeans Azul 42", barcode: "7896543210982", price: "159.90" },
    { name: "Meia Cano Curto", barcode: "7894900011517", price: "12.50" },
  );
}

async function findIndicator(name: string) {
  const region = await screen.findByRole("region", {
    name: "Indicadores do catálogo",
  });
  return within(region).getByRole("group", { name });
}

describe("Visão geral do catálogo (indicadores)", () => {
  it("mostra o total, o preço médio e a faixa de preços com dados reais", async () => {
    seedClothes();
    renderApp();

    const total = await findIndicator("Produtos no catálogo");
    expect(await within(total).findByText("3")).toBeVisible();
    expect(await findIndicator("Preço médio")).toHaveTextContent("R$ 74,10");
    const range = await findIndicator("Menor e maior preço");
    expect(range).toHaveTextContent("R$ 12,50");
    expect(range).toHaveTextContent("R$ 159,90");
  });

  it("FR-026 (011): o indicador de estoque mostra quantos estão para repor, com atalho", async () => {
    catalog.seed(
      {
        name: "Camiseta Básica Branca M",
        barcode: "7891000315507",
        stock_quantity: 4,
        min_stock: 10,
      },
      { name: "Meia Cano Curto", barcode: "7894900011517", min_stock: 2 },
      { name: "Calça Jeans Azul 42", barcode: "7896543210982" },
    );
    renderApp();

    const stock = await findIndicator("Estoque");
    expect(await within(stock).findByText("2")).toBeVisible();
    expect(stock).toHaveTextContent("Para repor");
    expect(
      within(stock).getByRole("link", { name: "Ver lista de reposição" }),
    ).toHaveAttribute("href", "/stock?view=restock");
  });

  it("os indicadores olham o catálogo inteiro, não a busca", async () => {
    seedClothes();
    const { user } = renderApp();

    await user.type(
      await screen.findByRole("searchbox", { name: "Buscar pelo nome" }),
      "Meia",
    );

    expect(await screen.findByText("1 produto encontrado")).toBeVisible();
    const total = await findIndicator("Produtos no catálogo");
    expect(within(total).getByText("3")).toBeVisible();
  });

  it("com o servidor fora do ar, os indicadores ficam sem valor", async () => {
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.error()));
    renderApp();

    expect(
      await screen.findByText("Não foi possível carregar os produtos."),
    ).toBeVisible();
    const total = await findIndicator("Produtos no catálogo");
    expect(total).toHaveTextContent("—");
  });

  it("a faixa de título tem a seção e a ação principal", async () => {
    renderApp();

    const title = await screen.findByRole("heading", {
      level: 1,
      name: "Produtos",
    });
    expect(title).toBeVisible();
    expect(screen.getByText("Catálogo da loja")).toBeVisible();
    expect(screen.getByRole("button", { name: "Novo produto" })).toBeVisible();
  });
});
