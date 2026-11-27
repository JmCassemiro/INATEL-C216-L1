import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { currentUrl, renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const NAME = "Camiseta Básica Branca M";

function seedClothes() {
  return catalog.seed(
    { name: NAME, barcode: "7891000315507", price: "49.90" },
    { name: "Calça Jeans Azul 42", barcode: "7896543210982", price: "159.90" },
  );
}

async function openRemove(user: User, name = NAME) {
  await user.click(
    await screen.findByRole("button", { name: `Remover ${name}` }),
  );
  return screen.findByRole("alertdialog", { name: `Remover ${name}?` });
}

describe("Remoção de produto (US4)", () => {
  it("US4-1, FR-013: pede confirmação com o nome e o aviso do código reservado", async () => {
    seedClothes();
    const { user } = renderApp();

    const dialog = await openRemove(user);

    expect(dialog).toHaveTextContent(
      "O produto sai do catálogo. O código de barras 7891000315507 continua reservado e não poderá ser usado em outro produto.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    ).toHaveFocus();
  });

  it("US4-2: confirmar remove, avisa e o produto some da lista", async () => {
    const [camiseta] = seedClothes();
    const { user } = renderApp();
    const dialog = await openRemove(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Remover produto" }),
    );

    expect(await screen.findByText("Produto removido")).toBeInTheDocument();
    expect(catalog.requestsTo("DELETE")).toEqual([
      { method: "DELETE", path: `/products/${camiseta?.id}`, body: null },
    ]);
    await waitFor(() =>
      expect(screen.queryByText(NAME)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Calça Jeans Azul 42")).toBeVisible();
  });

  it("US4-3: cancelar não remove nada e devolve o foco", async () => {
    seedClothes();
    const { user } = renderApp();
    const dialog = await openRemove(user);

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(catalog.requestsTo("DELETE")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: `Remover ${NAME}` }),
    ).toHaveFocus();
  });

  it("US4-4, FR-014: remover o único produto da última página volta à página anterior", async () => {
    catalog.seedMany(11);
    const { user, router } = renderApp("/products?page=2");

    // Na página 2 fica só o produto mais antigo.
    const dialog = await openRemove(user, "Produto 1");
    await user.click(
      within(dialog).getByRole("button", { name: "Remover produto" }),
    );

    expect(await screen.findByText("Produto removido")).toBeInTheDocument();
    await waitFor(() => expect(currentUrl(router)).toBe("/products"));
    expect(await screen.findByText("Página 1 de 1")).toBeVisible();
  });

  it("US4-5, FR-016: produto que já foi removido em outra aba", async () => {
    const [camiseta] = seedClothes();
    const { user } = renderApp();
    const dialog = await openRemove(user);

    catalog.remove(camiseta?.id ?? "");
    await user.click(
      within(dialog).getByRole("button", { name: "Remover produto" }),
    );

    expect(
      await screen.findByText(
        "Este produto não existe mais. A lista foi atualizada.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(NAME)).not.toBeInTheDocument(),
    );
  });

  it("US4-6: servidor fora do ar mostra o erro no diálogo e o produto continua", async () => {
    seedClothes();
    server.use(http.delete(`${PRODUCTS_URL}/:id`, () => HttpResponse.error()));
    const { user } = renderApp();
    const dialog = await openRemove(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Remover produto" }),
    );

    expect(
      await within(dialog).findByText(
        "Não foi possível remover: sem conexão com o servidor.",
      ),
    ).toBeVisible();
    expect(screen.getByText(NAME)).toBeInTheDocument();
  });

  it("FR-012: durante a remoção o botão fica desabilitado", async () => {
    seedClothes();
    server.use(
      http.delete(`${PRODUCTS_URL}/:id`, async () => {
        await delay("infinite");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderApp();
    const dialog = await openRemove(user);
    const confirm = within(dialog).getByRole("button", {
      name: "Remover produto",
    });

    await user.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
  });

  it("FR-020: no celular, o menu de ações da linha abre a remoção", async () => {
    setMediaMatches("(max-width: 639px)", true);
    seedClothes();
    const { user } = renderApp();

    await user.click(
      await screen.findByRole("button", { name: `Ações de ${NAME}` }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Remover" }));

    expect(
      await screen.findByRole("alertdialog", { name: `Remover ${NAME}?` }),
    ).toBeVisible();
  });
});
