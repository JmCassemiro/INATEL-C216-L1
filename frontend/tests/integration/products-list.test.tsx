import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { currentUrl, renderApp } from "../render";

const MOBILE = "(max-width: 639px)";

function seedClothes() {
  return catalog.seed(
    {
      name: "Camiseta Básica Branca M",
      description: "Algodão penteado, gola careca",
      barcode: "7891000315507",
      price: "49.90",
    },
    { name: "Calça Jeans Azul 42", barcode: "7896543210982", price: "159.90" },
    { name: "Meia Cano Curto", barcode: "7894900011517", price: "12.50" },
  );
}

async function findTable() {
  return screen.findByRole("table", { name: "Produtos" });
}

function bodyRows(table: HTMLElement) {
  // A primeira linha é o cabeçalho.
  return within(table).getAllByRole("row").slice(1);
}

describe("Lista de produtos (US1)", () => {
  it("US1-2, FR-006: mostra o carregamento enquanto a lista não chega", async () => {
    server.use(
      http.get(PRODUCTS_URL, async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );

    renderApp();

    expect(
      await screen.findByRole("status", { name: "Carregando produtos" }),
    ).toBeInTheDocument();
  });

  it("US1-1, FR-001, FR-005: mostra os produtos do mais novo para o mais antigo, com o total", async () => {
    seedClothes();

    renderApp();

    const rows = bodyRows(await findTable());
    expect(rows).toHaveLength(3);
    expect(
      within(rows[0] as HTMLElement).getByText("Meia Cano Curto"),
    ).toBeVisible();
    const camiseta = rows[2] as HTMLElement;
    expect(
      within(camiseta).getByText("Camiseta Básica Branca M"),
    ).toBeVisible();
    expect(
      within(camiseta).getByText("Algodão penteado, gola careca"),
    ).toBeVisible();
    expect(within(camiseta).getByText("7891000315507")).toBeVisible();
    expect(within(camiseta).getByText("R$ 49,90")).toBeInTheDocument();
    expect(screen.getByText("3 produtos no catálogo")).toBeVisible();
  });

  it("US1-6: catálogo vazio convida a cadastrar o primeiro produto", async () => {
    renderApp();

    expect(
      await screen.findByText("Nenhum produto cadastrado ainda."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cadastrar produto" }),
    ).toBeVisible();
  });

  it("US1-7: erro ao carregar mostra o alerta e 'Tentar de novo' recupera", async () => {
    seedClothes();
    server.use(
      http.get(PRODUCTS_URL, () => new HttpResponse(null, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = renderApp();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar os produtos.");

    await user.click(
      within(alert).getByRole("button", { name: "Tentar de novo" }),
    );

    expect(bodyRows(await findTable())).toHaveLength(3);
  });

  it("US1-3, FR-002: pagina de 10 em 10 e grava a página na URL", async () => {
    catalog.seedMany(12);
    const { user, router } = renderApp();

    const pagination = await screen.findByRole("navigation", {
      name: "Paginação",
    });
    expect(within(pagination).getByText("Página 1 de 2")).toBeVisible();
    expect(within(pagination).getByText("Mostrando 1–10 de 12")).toBeVisible();
    expect(
      within(pagination).getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    expect(bodyRows(await findTable())).toHaveLength(10);

    await user.click(
      within(pagination).getByRole("button", { name: "Próxima página" }),
    );

    expect(await within(pagination).findByText("Página 2 de 2")).toBeVisible();
    expect(bodyRows(await findTable())).toHaveLength(2);
    expect(currentUrl(router)).toBe("/products?page=2");
    expect(
      within(pagination).getByRole("button", { name: "Próxima página" }),
    ).toBeDisabled();
  });

  it("US1-4, FR-003: busca pelo nome sem diferenciar acentos e volta à página 1", async () => {
    seedClothes();
    const { user, router } = renderApp("/products?page=2");

    await user.type(
      await screen.findByRole("searchbox", { name: "Buscar pelo nome" }),
      "basica",
    );

    expect(await screen.findByText("1 produto encontrado")).toBeVisible();
    const rows = bodyRows(await findTable());
    expect(rows).toHaveLength(1);
    expect(
      within(rows[0] as HTMLElement).getByText("Camiseta Básica Branca M"),
    ).toBeVisible();
    expect(currentUrl(router)).toBe("/products?search=basica");
  });

  it("US1-5: busca sem resultado mostra a mensagem e 'Limpar busca'", async () => {
    seedClothes();
    const { user, router } = renderApp("/products?search=xyz");

    expect(await screen.findByText("Nenhum produto com “xyz”.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Limpar busca" }));

    expect(bodyRows(await findTable())).toHaveLength(3);
    expect(
      screen.getByRole("searchbox", { name: "Buscar pelo nome" }),
    ).toHaveValue("");
    expect(currentUrl(router)).toBe("/products");
  });

  it("US1-8, FR-004: abrir o endereço restaura a busca e a página", async () => {
    catalog.seedMany(25);

    renderApp("/products?search=produto&page=2");

    const pagination = await screen.findByRole("navigation", {
      name: "Paginação",
    });
    expect(await within(pagination).findByText("Página 2 de 3")).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Buscar pelo nome" }),
    ).toHaveValue("produto");
    expect(screen.getByText("25 produtos encontrados")).toBeVisible();
  });

  it("Edge Cases: página além da última mostra a última página", async () => {
    catalog.seedMany(12);
    const { router } = renderApp("/products?page=999");

    const pagination = await screen.findByRole("navigation", {
      name: "Paginação",
    });
    expect(await within(pagination).findByText("Página 2 de 2")).toBeVisible();
    await waitFor(() => expect(currentUrl(router)).toBe("/products?page=2"));
  });

  it("Edge Cases: a resposta atrasada de um termo antigo não substitui a do termo atual", async () => {
    catalog.seed(
      { name: "Camiseta Polo", barcode: "7891000315507" },
      { name: "Calça Social", barcode: "7896543210982" },
    );
    server.use(
      http.get(PRODUCTS_URL, async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name");
        if (name === "ca") await delay(600);
        return HttpResponse.json(
          catalog.list({ page: 1, size: 10, name: name ?? "" }),
        );
      }),
    );
    const { user } = renderApp();
    const search = await screen.findByRole("searchbox", {
      name: "Buscar pelo nome",
    });

    await user.type(search, "ca");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await user.type(search, "m");

    expect(await screen.findByText("1 produto encontrado")).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const rows = bodyRows(await findTable());
    expect(rows).toHaveLength(1);
    expect(
      within(rows[0] as HTMLElement).getByText("Camiseta Polo"),
    ).toBeVisible();
  });

  it("FR-002: paginação numerada leva direto à página e marca a atual", async () => {
    catalog.seedMany(25);
    const { user, router } = renderApp();

    const pagination = await screen.findByRole("navigation", {
      name: "Paginação",
    });
    expect(
      within(pagination).getByRole("button", { name: "Página 1" }),
    ).toHaveAttribute("aria-current", "page");

    await user.click(
      within(pagination).getByRole("button", { name: "Página 3" }),
    );

    expect(await within(pagination).findByText("Página 3 de 3")).toBeVisible();
    expect(currentUrl(router)).toBe("/products?page=3");
    expect(
      within(pagination).getByRole("button", { name: "Página 3" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("cada linha mostra o tipo do código de barras", async () => {
    seedClothes();
    renderApp();

    const [meia] = bodyRows(await findTable());
    expect(within(meia as HTMLElement).getByText("EAN-13")).toBeVisible();
  });

  it("FR-020: no celular, a tabela vira uma lista empilhada", async () => {
    setMediaMatches(MOBILE, true);
    seedClothes();

    renderApp();

    const list = await screen.findByRole("list", { name: "Produtos" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
