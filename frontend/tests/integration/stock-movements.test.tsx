import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const CAMISETA = "Camiseta Básica Branca M";

function seedShirtWithHistory(entries = 1) {
  const [shirt] = catalog.seed({
    name: CAMISETA,
    barcode: "7891000315507",
    min_stock: 10,
  });
  const id = shirt?.id ?? "";
  catalog.enter(id, { quantity: 24, note: "NF 1234" });
  for (let index = 1; index < entries; index++) {
    catalog.enter(id, { quantity: 1, note: null });
  }
  catalog.adjust(id, { quantity: -2, reason: "Avaria no transporte" });
  return shirt;
}

async function openHistory(user: User) {
  await user.click(
    await screen.findByRole("button", { name: `Ver histórico de ${CAMISETA}` }),
  );
  return within(
    await screen.findByRole("dialog", { name: `Histórico de ${CAMISETA}` }),
  );
}

describe("Histórico de movimentações (US4)", () => {
  it("US4-1: mostra as movimentações da mais recente para a mais antiga", async () => {
    seedShirtWithHistory();
    const { user } = renderApp("/stock");

    const sheet = await openHistory(user);

    expect(sheet.getByText("Saldo atual: 22 un.")).toBeVisible();
    const table = await sheet.findByRole("table", { name: "Movimentações" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Data", "Tipo", "Quantidade", "Saldo", "Observação"]);
    const [adjustment, entry] = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row));
    expect(adjustment?.getByText("Ajuste")).toBeVisible();
    expect(adjustment?.getByText("−2")).toBeVisible();
    expect(adjustment?.getByText("22 un.")).toBeVisible();
    expect(adjustment?.getByText("Avaria no transporte")).toBeVisible();
    expect(entry?.getByText("Entrada")).toBeVisible();
    expect(entry?.getByText("+24")).toBeVisible();
    expect(entry?.getByText("24 un.")).toBeVisible();
    expect(entry?.getByText("NF 1234")).toBeVisible();
    expect(entry?.getByText(/24\/11\/2026/)).toBeVisible();
  });

  it("spec 004, FR-019: a baixa por venda aparece como 'Venda' com o número", async () => {
    const shirt = seedShirtWithHistory();
    catalog.registerSale({
      id: "sale-a",
      items: [
        { product_id: shirt?.id ?? "", quantity: 2, unit_price: "10.00" },
      ],
      payments: [{ method: "pix", amount: "20.00" }],
    });
    const { user } = renderApp("/stock");

    const sheet = await openHistory(user);

    const table = await sheet.findByRole("table", { name: "Movimentações" });
    const sale = within(within(table).getAllByRole("row")[1] as HTMLElement);
    expect(sale.getByText("Venda")).toBeVisible();
    expect(sale.getByText("−2")).toBeVisible();
    expect(sale.getByText("20 un.")).toBeVisible();
    expect(sale.getByText("Venda nº 1")).toBeVisible();
  });

  it("US4-4: não há como editar nem apagar uma movimentação", async () => {
    seedShirtWithHistory();
    const { user } = renderApp("/stock");

    const sheet = await openHistory(user);
    await sheet.findByRole("table", { name: "Movimentações" });

    expect(
      sheet.queryByRole("button", { name: /editar|apagar|remover|excluir/i }),
    ).not.toBeInTheDocument();
  });

  it("US4-2: pagina o histórico de 10 em 10", async () => {
    const shirt = seedShirtWithHistory(11);
    const { user } = renderApp("/stock");
    const sheet = await openHistory(user);
    const rows = async () =>
      within(await sheet.findByRole("table", { name: "Movimentações" }))
        .getAllByRole("row")
        .slice(1);

    expect(await rows()).toHaveLength(10);
    const pagination = sheet.getByRole("navigation", {
      name: "Paginação do histórico",
    });
    await user.click(
      within(pagination).getByRole("button", { name: "Próxima página" }),
    );

    await waitFor(async () => expect(await rows()).toHaveLength(2));
    expect(
      catalog
        .requestsTo("GET")
        .some(
          (request) =>
            request.path ===
            `/products/${shirt?.id}/stock/movements?page=2&size=10`,
        ),
    ).toBe(true);
  });

  it("US4-3: sem movimentações, convida a registrar a primeira entrada", async () => {
    catalog.seed({ name: CAMISETA, barcode: "7891000315507" });
    const { user } = renderApp("/stock");
    const sheet = await openHistory(user);

    expect(await sheet.findByText("Nenhuma movimentação ainda.")).toBeVisible();
    await user.click(sheet.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await screen.findByRole("dialog", { name: "Registrar entrada" }),
    ).toBeVisible();
  });

  it("FR-024: erro ao carregar o histórico mostra 'Tentar de novo'", async () => {
    seedShirtWithHistory();
    server.use(
      http.get(
        `${PRODUCTS_URL}/:id/stock/movements`,
        () => HttpResponse.json({}, { status: 500 }),
        { once: true },
      ),
    );
    const { user } = renderApp("/stock");
    const sheet = await openHistory(user);

    expect(
      await sheet.findByText("Não foi possível carregar o histórico."),
    ).toBeVisible();
    await user.click(sheet.getByRole("button", { name: "Tentar de novo" }));

    expect(
      await sheet.findByRole("table", { name: "Movimentações" }),
    ).toBeVisible();
  });

  it("FR-028: no celular, o histórico vira lista e abre pelo menu do produto", async () => {
    setMediaMatches("(max-width: 639px)", true);
    seedShirtWithHistory();
    const { user } = renderApp("/stock");

    await user.click(
      await screen.findByRole("button", { name: `Ações de ${CAMISETA}` }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "Ver histórico" }),
    );

    const sheet = within(
      await screen.findByRole("dialog", { name: `Histórico de ${CAMISETA}` }),
    );
    const list = await sheet.findByRole("list", { name: "Movimentações" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
