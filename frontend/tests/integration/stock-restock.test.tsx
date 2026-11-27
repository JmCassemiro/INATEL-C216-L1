import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { STOCK_SUMMARY_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { currentUrl, renderApp } from "../render";

function seedShelf() {
  return catalog.seed(
    {
      name: "Camiseta Básica Branca M",
      barcode: "7891000315507",
      price: "49.90",
      stock_quantity: 8,
      min_stock: 10,
    },
    {
      name: "Água Mineral 500 ml",
      barcode: "7896543210982",
      price: "2.50",
      stock_quantity: 4,
      min_stock: 10,
    },
    {
      name: "Boné Aba Curva",
      barcode: "7894900011517",
      price: "59.90",
      stock_quantity: 15,
      min_stock: 5,
    },
    {
      name: "Meia Cano Curto",
      barcode: "7891234567895",
      price: "12.50",
      min_stock: 7,
    },
  );
}

async function findIndicator(name: string) {
  const region = await screen.findByRole("region", {
    name: "Indicadores do estoque",
  });
  return within(region).getByRole("group", { name });
}

const NAMES = [
  "Camiseta Básica Branca M",
  "Água Mineral 500 ml",
  "Boné Aba Curva",
  "Meia Cano Curto",
];

/** Nome do produto de cada linha, na ordem da tabela. */
function rowNames(table: HTMLElement) {
  return within(table)
    .getAllByRole("rowheader")
    .map((cell) => NAMES.find((name) => cell.textContent?.includes(name)));
}

describe("Lista de reposição e indicadores (US2)", () => {
  it("US2-3, FR-014, FR-017: 'Para repor' mostra só quem está abaixo do mínimo, maior falta antes", async () => {
    seedShelf();
    const { user, router } = renderApp("/stock");
    const view = await screen.findByRole("group", { name: "Mostrar" });
    expect(within(view).getByRole("button", { name: "Todos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(within(view).getByRole("button", { name: "Para repor" }));

    await waitFor(() => expect(currentUrl(router)).toBe("/stock?view=restock"));
    expect(
      within(view).getByRole("button", { name: "Para repor" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() =>
      expect(rowNames(screen.getByRole("table", { name: "Estoque" }))).toEqual([
        "Meia Cano Curto",
        "Água Mineral 500 ml",
        "Camiseta Básica Branca M",
      ]),
    );
    expect(screen.getByText("Repor · faltam 6")).toBeVisible();
    expect(screen.getByText("3 produtos para repor")).toBeVisible();
    const restockQuery = catalog
      .requestsTo("GET")
      .map((request) => new URL(request.path, "http://api").searchParams)
      .find((params) => params.get("restock") === "true");
    expect(restockQuery?.get("sort")).toBe("shortfall");
  });

  it("US2-3: sem produto abaixo do mínimo, avisa que nada precisa de reposição", async () => {
    catalog.seed({
      name: "Boné Aba Curva",
      barcode: "7894900011517",
      stock_quantity: 15,
      min_stock: 5,
    });
    renderApp("/stock?view=restock");

    expect(
      await screen.findByText("Nenhum produto precisa de reposição."),
    ).toBeVisible();
  });

  it("FR-018: indicadores de reposição, sem estoque e valor do estoque", async () => {
    seedShelf();
    renderApp("/stock");

    expect(
      await within(await findIndicator("Para repor")).findByText("3"),
    ).toBeVisible();
    expect(await findIndicator("Sem estoque")).toHaveTextContent("1");
    // 8 × 49,90 + 4 × 2,50 + 15 × 59,90 = 399,20 + 10,00 + 898,50
    expect(await findIndicator("Valor em estoque")).toHaveTextContent(
      "R$ 1.307,70",
    );
  });

  it("FR-018: com o resumo fora do ar, os indicadores ficam sem valor", async () => {
    seedShelf();
    server.use(http.get(STOCK_SUMMARY_URL, () => HttpResponse.error()));
    renderApp("/stock");

    await waitFor(async () =>
      expect(await findIndicator("Para repor")).toHaveTextContent("—"),
    );
  });

  it("US2-6, SC-006: uma entrada que leva ao mínimo tira o produto da reposição sem recarregar", async () => {
    seedShelf();
    const { user } = renderApp("/stock?view=restock");
    const table = await screen.findByRole("table", { name: "Estoque" });
    await waitFor(() => expect(rowNames(table)).toHaveLength(3));

    await user.click(
      screen.getByRole("button", {
        name: "Registrar entrada de Água Mineral 500 ml",
      }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "Registrar entrada" }),
    );
    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "6");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    await waitFor(() =>
      expect(
        rowNames(screen.getByRole("table", { name: "Estoque" })),
      ).not.toContain("Água Mineral 500 ml"),
    );
    await waitFor(async () =>
      expect(await findIndicator("Para repor")).toHaveTextContent("2"),
    );
  });

  it("US2-7: o menu lateral mostra quantos produtos precisam de reposição", async () => {
    seedShelf();
    renderApp();

    const sections = await screen.findByRole("navigation", { name: "Seções" });
    const link = within(sections).getByRole("link", { name: "Estoque" });
    expect(await within(link).findByText("3")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("US2-7: sem nada para repor, o menu não mostra número", async () => {
    catalog.seed({ name: "Boné Aba Curva", barcode: "7894900011517" });
    renderApp();

    const sections = await screen.findByRole("navigation", { name: "Seções" });
    await waitFor(() =>
      expect(catalog.requestsTo("GET").map((r) => r.path)).toContain(
        "/stock/summary",
      ),
    );
    expect(
      within(sections).getByRole("link", { name: "Estoque" }).textContent,
    ).toBe("Estoque");
  });
});
