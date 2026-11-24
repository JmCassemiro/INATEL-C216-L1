import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { catalog, gtin13 } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { currentUrl, renderApp } from "../render";

const MOBILE = "(max-width: 639px)";

function seedShelf() {
  return catalog.seed(
    {
      name: "Camiseta Básica Branca M",
      barcode: "7891000315507",
      stock_quantity: 36,
      min_stock: 10,
    },
    {
      name: "Água Mineral 500 ml",
      barcode: "7896543210982",
      stock_quantity: 4,
      min_stock: 10,
    },
    { name: "Meia Cano Curto", barcode: "7894900011517" },
  );
}

async function findTable() {
  return screen.findByRole("table", { name: "Estoque" });
}

function bodyRows(table: HTMLElement) {
  return within(table).getAllByRole("row").slice(1);
}

function stockRequests() {
  return catalog
    .requestsTo("GET")
    .map((request) => request.path)
    .filter((path) => path.includes("sort=name"));
}

describe("Seção Estoque (US1)", () => {
  it("FR-016: o menu leva à seção Estoque, marcada como atual", async () => {
    const { user, router } = renderApp();

    const sections = await screen.findByRole("navigation", { name: "Seções" });
    await user.click(within(sections).getByRole("link", { name: "Estoque" }));

    expect(currentUrl(router)).toBe("/stock");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Estoque" }),
    ).toBeInTheDocument();
    expect(
      within(sections).getByRole("link", { name: "Estoque" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("US1-1, FR-016: lista em ordem alfabética com saldo, mínimo e situação", async () => {
    seedShelf();
    renderApp("/stock");

    const table = await findTable();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Produto", "Quantidade", "Mínimo", "Situação", "Ações"]);
    const rows = bodyRows(table).map((row) => within(row));
    expect(rows.map((row) => row.getByRole("rowheader").textContent)).toEqual([
      expect.stringContaining("Água Mineral 500 ml"),
      expect.stringContaining("Camiseta Básica Branca M"),
      expect.stringContaining("Meia Cano Curto"),
    ]);
    expect(rows[0]?.getByText("4 un.")).toBeVisible();
    expect(rows[0]?.getByText("Repor · faltam 6")).toBeVisible();
    expect(rows[1]?.getByText("36 un.")).toBeVisible();
    expect(rows[1]?.getByText("Em dia")).toBeVisible();
    expect(rows[2]?.getByText("Sem estoque")).toBeVisible();
    expect(screen.getByText("3 produtos")).toBeVisible();
    expect(stockRequests()[0]).toBe("/products?page=1&size=10&sort=name");
  });

  it("FR-024: mostra o carregamento enquanto a lista não chega", async () => {
    server.use(
      http.get(PRODUCTS_URL, async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    renderApp("/stock");

    expect(
      await screen.findByRole("status", { name: "Carregando o estoque…" }),
    ).toBeInTheDocument();
  });

  it("FR-024: catálogo vazio leva para a seção Produtos", async () => {
    renderApp("/stock");

    expect(
      await screen.findByText("Nenhum produto cadastrado ainda."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ir para Produtos" }),
    ).toHaveAttribute("href", "/products");
  });

  it("FR-024: erro ao carregar mostra o alerta e 'Tentar de novo' recupera", async () => {
    seedShelf();
    // Só a posição de estoque falha (uma vez); a contagem do menu lateral segue normal.
    let failed = false;
    server.use(
      http.get(PRODUCTS_URL, ({ request }) => {
        const sort = new URL(request.url).searchParams.get("sort");
        if (failed || sort !== "name") return undefined;
        failed = true;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = renderApp("/stock");

    expect(
      await screen.findByText("Não foi possível carregar o estoque."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await findTable()).toBeInTheDocument();
  });

  it("FR-016, FR-017: busca pelo nome e grava a busca na URL", async () => {
    seedShelf();
    const { user, router } = renderApp("/stock");
    await findTable();

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar pelo nome" }),
      "agua",
    );

    await waitFor(() =>
      expect(bodyRows(screen.getByRole("table"))).toHaveLength(1),
    );
    expect(currentUrl(router)).toBe("/stock?search=agua");
    expect(screen.getByText("1 produto")).toBeVisible();
  });

  it("FR-024: busca sem resultado mostra a mensagem e 'Limpar busca'", async () => {
    seedShelf();
    const { user } = renderApp("/stock?search=xyz");

    expect(
      await screen.findByText("Nenhum produto encontrado para “xyz”."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(bodyRows(await findTable())).toHaveLength(3);
  });

  it("FR-016: pagina de 10 em 10", async () => {
    catalog.seed(
      ...Array.from({ length: 12 }, (_, index) => ({
        name: `Produto ${String(index + 1).padStart(2, "0")}`,
        barcode: gtin13(index + 1),
      })),
    );
    const { user, router } = renderApp("/stock");

    expect(bodyRows(await findTable())).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "Próxima página" }));

    await waitFor(() => expect(currentUrl(router)).toBe("/stock?page=2"));
    await waitFor(() =>
      expect(bodyRows(screen.getByRole("table"))).toHaveLength(2),
    );
  });

  it("FR-028: no celular, vira lista com o menu 'Ações de {nome}'", async () => {
    setMediaMatches(MOBILE, true);
    seedShelf();
    const { user } = renderApp("/stock");

    const list = await screen.findByRole("list", { name: "Estoque" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    await user.click(
      within(list).getByRole("button", {
        name: "Ações de Camiseta Básica Branca M",
      }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Registrar entrada" }),
    ).toBeVisible();
  });
});
