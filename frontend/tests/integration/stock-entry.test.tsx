import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const CAMISETA = "Camiseta Básica Branca M";

function seedShirt(stock_quantity = 12) {
  const [shirt] = catalog.seed({
    name: CAMISETA,
    barcode: "7891000315507",
    stock_quantity,
    min_stock: 10,
  });
  return shirt;
}

async function openEntry(user: User, name = CAMISETA) {
  await user.click(
    await screen.findByRole("button", { name: `Registrar entrada de ${name}` }),
  );
  return screen.findByRole("dialog", { name: "Registrar entrada" });
}

async function rowOf(name: string) {
  const table = await screen.findByRole("table", { name: "Estoque" });
  const row = within(table)
    .getAllByRole("row")
    .find((candidate) => within(candidate).queryByText(name));
  if (!row) throw new Error(`linha de ${name} não encontrada`);
  return within(row);
}

describe("Entrada de mercadoria (US1)", () => {
  it("US1-3: abre com o nome e o saldo atual e o foco na quantidade", async () => {
    seedShirt();
    const { user } = renderApp("/stock");

    const dialog = within(await openEntry(user));

    expect(dialog.getByText(CAMISETA)).toBeVisible();
    expect(dialog.getByText("Saldo atual: 12 un.")).toBeVisible();
    expect(dialog.getByRole("textbox", { name: "Quantidade" })).toHaveFocus();
    expect(
      dialog.getByRole("textbox", { name: "Observação (opcional)" }),
    ).toHaveAccessibleDescription("Ex.: número da nota do fornecedor.");
  });

  it("US1-3, FR-023: registra, avisa e mostra o saldo novo sem recarregar", async () => {
    const shirt = seedShirt();
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "24");
    await user.type(
      dialog.getByRole("textbox", { name: "Observação (opcional)" }),
      "NF 1234",
    );
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await screen.findByText(
        `Entrada registrada: ${CAMISETA} agora tem 36 un.`,
      ),
    ).toBeInTheDocument();
    expect(catalog.requestsTo("POST")).toEqual([
      {
        method: "POST",
        path: `/products/${shirt?.id}/stock/entries`,
        body: { quantity: 24, note: "NF 1234" },
      },
    ]);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect((await rowOf(CAMISETA)).getByText("36 un.")).toBeVisible();
  });

  it("US1-5, FR-021: quantidade inválida não é enviada e mostra o motivo", async () => {
    seedShirt();
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "1,5");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await dialog.findByText("Use só números inteiros, como 24 ou 1.000."),
    ).toBeVisible();
    expect(dialog.getByRole("textbox", { name: "Quantidade" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("US1-6: saldo acima do teto é recusado com a mensagem do servidor no campo", async () => {
    seedShirt(999_990);
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "10");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await dialog.findByText("O saldo não pode passar de 999.999 unidades"),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("FR-022: durante o envio, o botão avisa e não envia de novo", async () => {
    seedShirt();
    server.use(
      http.post(`${PRODUCTS_URL}/:id/stock/entries`, async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "5");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));
    const pending = await dialog.findByRole("button", { name: "Registrando…" });

    expect(pending).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("US1-8: sem conexão, avisa e mantém os dados no formulário", async () => {
    seedShirt();
    server.use(
      http.post(`${PRODUCTS_URL}/:id/stock/entries`, () =>
        HttpResponse.error(),
      ),
    );
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "5");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await dialog.findByText(
        "Não foi possível registrar: sem conexão com o servidor.",
      ),
    ).toBeVisible();
    expect(dialog.getByRole("textbox", { name: "Quantidade" })).toHaveValue(
      "5",
    );
  });

  it("Edge case: produto removido em outra aba fecha o diálogo e atualiza a lista", async () => {
    const shirt = seedShirt();
    const { user } = renderApp("/stock");
    const dialog = within(await openEntry(user));
    catalog.remove(shirt?.id ?? "");

    await user.type(dialog.getByRole("textbox", { name: "Quantidade" }), "5");
    await user.click(dialog.getByRole("button", { name: "Registrar entrada" }));

    expect(
      await screen.findByText(
        "Este produto não existe mais. A lista foi atualizada.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText("Nenhum produto cadastrado ainda."),
    ).toBeVisible();
  });

  it("Esc fecha sem gravar e devolve o foco ao botão da linha", async () => {
    seedShirt();
    const { user } = renderApp("/stock");
    await openEntry(user);

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: `Registrar entrada de ${CAMISETA}` }),
    ).toHaveFocus();
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });
});
