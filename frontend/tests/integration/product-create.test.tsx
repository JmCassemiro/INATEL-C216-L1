import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

async function openForm(user: User) {
  await user.click(await screen.findByRole("button", { name: "Novo produto" }));
  return screen.findByRole("dialog", { name: "Novo produto" });
}

async function fill(
  user: User,
  dialog: HTMLElement,
  values: { name?: string; barcode?: string; price?: string },
) {
  const form = within(dialog);
  if (values.name !== undefined)
    await user.type(form.getByRole("textbox", { name: "Nome" }), values.name);
  if (values.barcode !== undefined)
    await user.type(
      form.getByRole("textbox", { name: "Código de barras" }),
      values.barcode,
    );
  if (values.price !== undefined)
    await user.type(
      form.getByRole("textbox", { name: "Preço de venda" }),
      values.price,
    );
}

const CAMISETA = {
  name: "Camiseta Básica Branca M",
  barcode: "7891000315507",
  price: "49,90",
};

describe("Cadastro de produto (US2)", () => {
  it("US2-1: abre o painel com o foco no nome", async () => {
    const { user } = renderApp();

    const dialog = await openForm(user);

    expect(within(dialog).getByRole("textbox", { name: "Nome" })).toHaveFocus();
  });

  it("US2-1, FR-005, FR-015, FR-017: cadastra, avisa e mostra o produto no topo, destacado", async () => {
    catalog.seed({ name: "Meia Cano Curto", barcode: "7894900011517" });
    const { user } = renderApp();
    const dialog = await openForm(user);

    await fill(user, dialog, CAMISETA);
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(await screen.findByText("Produto cadastrado")).toBeInTheDocument();
    expect(catalog.requestsTo("POST")[0]?.body).toEqual({
      name: "Camiseta Básica Branca M",
      description: null,
      barcode: "7891000315507",
      price: "49.90",
      min_stock: 0,
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const table = await screen.findByRole("table", { name: "Produtos" });
    const firstRow = await waitFor(() => {
      const row = within(table).getAllByRole("row")[1] as HTMLElement;
      expect(within(row).getByText("Camiseta Básica Branca M")).toBeVisible();
      return row;
    });
    expect(firstRow).toHaveAttribute("data-highlighted", "true");
  });

  it("US2-3, FR-009: dados inválidos não são enviados e cada campo mostra o motivo", async () => {
    const { user } = renderApp();
    const dialog = await openForm(user);
    const form = within(dialog);

    await fill(user, dialog, { barcode: "7891000315508", price: "0" });
    await user.click(form.getByRole("button", { name: "Cadastrar produto" }));

    expect(form.getByRole("textbox", { name: "Nome" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      form.getByRole("textbox", { name: "Nome" }),
    ).toHaveAccessibleDescription("Informe o nome do produto.");
    expect(
      form.getByRole("textbox", { name: "Código de barras" }),
    ).toHaveAccessibleDescription(
      "Confira os dígitos: o código de barras não é válido.",
    );
    expect(
      form.getByRole("textbox", { name: "Preço de venda" }),
    ).toHaveAccessibleDescription("Informe um preço maior que zero.");
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("FR-009: depois do primeiro envio, o erro some assim que o campo é corrigido", async () => {
    const { user } = renderApp();
    const dialog = await openForm(user);
    const form = within(dialog);

    await user.click(form.getByRole("button", { name: "Cadastrar produto" }));
    await user.type(form.getByRole("textbox", { name: "Nome" }), "Caneta");

    expect(form.getByRole("textbox", { name: "Nome" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      form.queryByText("Informe o nome do produto."),
    ).not.toBeInTheDocument();
  });

  it("US2-4, FR-011: código já cadastrado aparece no campo e os dados ficam", async () => {
    catalog.seed({ name: "Outro produto", barcode: "7891000315507" });
    const { user } = renderApp();
    const dialog = await openForm(user);
    const form = within(dialog);

    await fill(user, dialog, CAMISETA);
    await user.click(form.getByRole("button", { name: "Cadastrar produto" }));

    expect(
      await form.findByText("Código de barras já cadastrado"),
    ).toBeVisible();
    expect(
      form.getByRole("textbox", { name: "Código de barras" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(form.getByRole("textbox", { name: "Nome" })).toHaveValue(
      "Camiseta Básica Branca M",
    );
  });

  it("FR-011: erro 422 da API aparece no campo indicado", async () => {
    server.use(
      http.post(PRODUCTS_URL, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "price"],
                msg: "Preço acima do permitido",
                type: "value_error",
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderApp();
    const dialog = await openForm(user);

    await fill(user, dialog, CAMISETA);
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(
      await within(dialog).findByText("Preço acima do permitido"),
    ).toBeVisible();
  });

  it("US2-6: servidor fora do ar mostra o erro no painel e mantém os dados", async () => {
    server.use(http.post(PRODUCTS_URL, () => HttpResponse.error()));
    const { user } = renderApp();
    const dialog = await openForm(user);

    await fill(user, dialog, CAMISETA);
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(
      await within(dialog).findByText(
        "Não foi possível salvar: sem conexão com o servidor.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByRole("textbox", { name: "Nome" })).toHaveValue(
      "Camiseta Básica Branca M",
    );
  });

  it("US2-5, FR-012: durante o envio o botão fica desabilitado e não há envio duplo", async () => {
    server.use(
      http.post(PRODUCTS_URL, async ({ request }) => {
        catalog.record({ method: "POST", path: "/products", body: null });
        await delay(300);
        return HttpResponse.json(
          { ...((await request.json()) as object), id: "novo" },
          { status: 201 },
        );
      }),
    );
    const { user } = renderApp();
    const dialog = await openForm(user);
    await fill(user, dialog, CAMISETA);
    const submit = within(dialog).getByRole("button", {
      name: "Cadastrar produto",
    });

    await user.click(submit);
    await user.click(submit);

    expect(submit).toBeDisabled();
    expect(await screen.findByText("Produto cadastrado")).toBeInTheDocument();
    expect(catalog.requestsTo("POST")).toHaveLength(1);
  });

  it("US2-7, FR-010: aceita o preço com ponto", async () => {
    const { user } = renderApp();
    const dialog = await openForm(user);

    await fill(user, dialog, { ...CAMISETA, price: "49.9" });
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(await screen.findByText("Produto cadastrado")).toBeInTheDocument();
    expect(catalog.requestsTo("POST")[0]?.body).toMatchObject({
      price: "49.90",
    });
  });

  it("FR-021: Esc fecha sem enviar e o foco volta para 'Novo produto'", async () => {
    const { user } = renderApp();
    await openForm(user);

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Novo produto" })).toHaveFocus();
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("US1-6: no catálogo vazio, 'Cadastrar produto' abre o painel", async () => {
    const { user } = renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Cadastrar produto" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Novo produto" }),
    ).toBeVisible();
  });

  it("FR-012 (011): envia o estoque mínimo informado, com a explicação do campo", async () => {
    const { user } = renderApp();
    const dialog = await openForm(user);
    const minimum = within(dialog).getByRole("textbox", {
      name: "Estoque mínimo (opcional)",
    });

    expect(minimum).toHaveAccessibleDescription(
      "Abaixo dessa quantidade, o produto entra na lista de reposição.",
    );
    await fill(user, dialog, CAMISETA);
    await user.type(minimum, "10");
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(await screen.findByText("Produto cadastrado")).toBeInTheDocument();
    expect(catalog.requestsTo("POST")[0]?.body).toMatchObject({
      min_stock: 10,
    });
  });

  it("FR-012 (011): mínimo inválido não é enviado e mostra o motivo no campo", async () => {
    const { user } = renderApp();
    const dialog = await openForm(user);

    await fill(user, dialog, CAMISETA);
    await user.type(
      within(dialog).getByRole("textbox", {
        name: "Estoque mínimo (opcional)",
      }),
      "1,5",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Cadastrar produto" }),
    );

    expect(
      await within(dialog).findByText(
        "Use só números inteiros, como 24 ou 1.000.",
      ),
    ).toBeInTheDocument();
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });
});
