import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { todayRange } from "@/lib/date";
import { catalog, gtin13 } from "../msw/catalog";
import { SALES_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { currentUrl, renderApp } from "../render";

const SHIRT = {
  name: "Camiseta Básica Branca M",
  barcode: "7891000315507",
  price: "49.90",
  stock_quantity: 50,
};
const SOCKS = {
  name: "Meia Cano Curto",
  barcode: gtin13(2),
  price: "37.70",
  stock_quantity: 50,
};

function seedTwoSales() {
  const [shirt, socks] = catalog.seed(SHIRT, SOCKS);
  if (!shirt || !socks) throw new Error("produtos não semeados");
  const first = catalog.seedSale({
    items: [{ product: shirt, quantity: 1 }],
    occurred_at: "2020-01-10T15:00:00Z",
  });
  const second = catalog.seedSale({
    items: [
      { product: shirt, quantity: 2 },
      { product: socks, quantity: 1 },
    ],
    payments: [
      { method: "pix", amount: "50.00" },
      { method: "cash", amount: "100.00" },
    ],
  });
  return { first, second };
}

async function salesTable() {
  return screen.findByRole("table", { name: "Vendas realizadas" });
}

function rows(table: HTMLElement) {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row));
}

describe("Histórico de vendas (US3)", () => {
  it("FR-027: mostra o carregamento", async () => {
    server.use(
      http.get(SALES_URL, async () => {
        await delay(400);
        return HttpResponse.json({ items: [], total: 0, page: 1, size: 10 });
      }),
    );
    renderApp("/sales");

    expect(
      await screen.findByRole("status", { name: "Carregando as vendas…" }),
    ).toBeVisible();
  });

  it("US3-5: sem vendas, convida a registrar a primeira", async () => {
    renderApp("/sales");

    expect(
      await screen.findByText("Nenhuma venda registrada ainda."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Registrar a primeira venda" }),
    ).toHaveAttribute("href", "/sales/new");
  });

  it("FR-027: erro ao carregar, com tentar de novo", async () => {
    server.use(
      http.get(SALES_URL, () => HttpResponse.json({}, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = renderApp("/sales");

    expect(
      await screen.findByText("Não foi possível carregar as vendas."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(
      await screen.findByText("Nenhuma venda registrada ainda."),
    ).toBeVisible();
  });

  it("US3-1: da mais recente para a mais antiga, com itens, pagamento e total", async () => {
    seedTwoSales();
    renderApp("/sales");

    const table = await salesTable();

    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Venda", "Data", "Itens", "Pagamento", "Total", "Ações"]);
    const [newest, oldest] = rows(table);
    expect(newest?.getByText("nº 2")).toBeVisible();
    expect(newest?.getByText("3 un.")).toBeVisible();
    expect(newest?.getByText("Pix + Dinheiro")).toBeVisible();
    expect(newest?.getByText("R$ 137,50")).toBeVisible();
    expect(oldest?.getByText("nº 1")).toBeVisible();
    expect(oldest?.getByText(/10\/01\/2020/)).toBeVisible();
    expect(screen.getByText("2 vendas")).toBeVisible();
  });

  it("FR-021: pagina de 10 em 10, com a página na URL", async () => {
    const [shirt] = catalog.seed(SHIRT);
    for (let index = 0; index < 11; index++) {
      catalog.seedSale({ items: [{ product: shirt as never, quantity: 1 }] });
    }
    const { user, router } = renderApp("/sales");
    const table = await salesTable();
    expect(rows(table)).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "Página 2" }));

    await waitFor(() => expect(currentUrl(router)).toBe("/sales?page=2"));
    await waitFor(async () => {
      const page2 = rows(await salesTable());
      expect(page2).toHaveLength(1);
      expect(page2[0]?.getByText("nº 1")).toBeVisible();
    });
  });

  it("US3-2, US3-4: o detalhe mostra itens, pagamentos e totais, sem editar", async () => {
    seedTwoSales();
    const { user } = renderApp("/sales");
    await salesTable();

    await user.click(screen.getByRole("button", { name: "Ver venda nº 2" }));

    const detail = within(
      await screen.findByRole("dialog", { name: "Venda nº 2" }),
    );
    const items = detail.getByRole("list", { name: "Itens" });
    expect(within(items).getByText(`2 × ${SHIRT.name}`)).toBeVisible();
    expect(within(items).getByText(`1 × ${SOCKS.name}`)).toBeVisible();
    const payments = detail.getByRole("list", { name: "Pagamentos" });
    expect(within(payments).getByText("Pix")).toBeVisible();
    expect(within(payments).getByText("R$ 100,00")).toBeVisible();
    expect(detail.getByText("Troco")).toBeVisible();
    expect(detail.getByText("R$ 12,50")).toBeVisible();
    expect(
      detail.queryByRole("button", { name: /editar|cancelar|apagar|excluir/i }),
    ).toBeNull();
  });

  it("US3-6: indicadores só com as vendas de hoje, pedidos no dia local", async () => {
    seedTwoSales();
    renderApp("/sales");

    const indicators = within(
      await screen.findByRole("region", { name: "Indicadores de hoje" }),
    );

    const count = within(
      indicators.getByRole("group", { name: "Vendas hoje" }),
    );
    await waitFor(() => expect(count.getByText("1")).toBeVisible());
    expect(
      within(
        indicators.getByRole("group", { name: "Faturamento hoje" }),
      ).getByText("R$ 137,50"),
    ).toBeVisible();
    expect(
      within(
        indicators.getByRole("group", { name: "Ticket médio hoje" }),
      ).getByText("R$ 137,50"),
    ).toBeVisible();
    const { start, end } = todayRange();
    expect(
      catalog
        .requestsTo("GET")
        .some(
          (request) =>
            request.path ===
            `/sales/summary?${new URLSearchParams({ start, end })}`,
        ),
    ).toBe(true);
  });

  it("US3-7: a venda recém-finalizada aparece no topo e nos indicadores", async () => {
    catalog.seed(SHIRT);
    const { user } = renderApp("/sales/new");
    await screen.findByRole("heading", { name: "Nova venda", level: 1 });
    await user.type(
      screen.getByRole("textbox", { name: "Código de barras" }),
      `${SHIRT.barcode}{Enter}`,
    );
    await screen.findByRole("table", { name: "Itens da venda" });
    await user.click(
      screen.getByRole("button", { name: "Adicionar pagamento" }),
    );
    await user.click(screen.getByRole("button", { name: "Finalizar venda" }));
    const receipt = await screen.findByRole("dialog", {
      name: "Venda nº 1 registrada",
    });

    await user.click(within(receipt).getByRole("link", { name: "Ver vendas" }));

    const table = await salesTable();
    expect(rows(table)[0]?.getByText("nº 1")).toBeVisible();
    const count = within(screen.getByRole("group", { name: "Vendas hoje" }));
    await waitFor(() => expect(count.getByText("1")).toBeVisible());
  });
});
