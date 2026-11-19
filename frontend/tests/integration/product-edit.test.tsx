import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { catalog } from "../msw/catalog";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

function seedClothes() {
  return catalog.seed(
    {
      name: "Camiseta Básica Branca M",
      description: "Algodão penteado",
      barcode: "7891000315507",
      price: "49.90",
    },
    { name: "Calça Jeans Azul 42", barcode: "7896543210982", price: "159.90" },
  );
}

async function openEdit(user: User, name: string) {
  await user.click(
    await screen.findByRole("button", { name: `Editar ${name}` }),
  );
  return screen.findByRole("dialog", { name: "Editar produto" });
}

async function replaceText(user: User, input: HTMLElement, text: string) {
  await user.clear(input);
  if (text) await user.type(input, text);
}

describe("Edição de produto (US3)", () => {
  it("US3-1: abre o painel com os dados atuais", async () => {
    seedClothes();
    const { user } = renderApp();

    const dialog = within(await openEdit(user, "Camiseta Básica Branca M"));

    expect(dialog.getByRole("textbox", { name: "Nome" })).toHaveValue(
      "Camiseta Básica Branca M",
    );
    expect(
      dialog.getByRole("textbox", { name: "Descrição (opcional)" }),
    ).toHaveValue("Algodão penteado");
    expect(
      dialog.getByRole("textbox", { name: "Código de barras" }),
    ).toHaveValue("7891000315507");
    expect(dialog.getByRole("textbox", { name: "Preço de venda" })).toHaveValue(
      "49,90",
    );
  });

  it("US3-2, FR-017: salva o preço novo com PUT completo e destaca a linha, na mesma posição", async () => {
    const [camiseta] = seedClothes();
    const { user } = renderApp();
    const dialog = within(await openEdit(user, "Camiseta Básica Branca M"));

    await replaceText(
      user,
      dialog.getByRole("textbox", { name: "Preço de venda" }),
      "54,90",
    );
    await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Alterações salvas")).toBeInTheDocument();
    expect(catalog.requestsTo("PUT")).toEqual([
      {
        method: "PUT",
        path: `/products/${camiseta?.id}`,
        body: {
          name: "Camiseta Básica Branca M",
          description: "Algodão penteado",
          barcode: "7891000315507",
          price: "54.90",
        },
      },
    ]);
    const table = await screen.findByRole("table", { name: "Produtos" });
    await waitFor(() => {
      const row = within(table).getAllByRole("row")[2] as HTMLElement;
      expect(within(row).getByText("R$ 54,90")).toBeInTheDocument();
      expect(row).toHaveAttribute("data-highlighted", "true");
    });
  });

  it("US3-3: apagar a descrição envia null", async () => {
    seedClothes();
    const { user } = renderApp();
    const dialog = within(await openEdit(user, "Camiseta Básica Branca M"));

    await replaceText(
      user,
      dialog.getByRole("textbox", { name: "Descrição (opcional)" }),
      "",
    );
    await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Alterações salvas")).toBeInTheDocument();
    expect(catalog.requestsTo("PUT")[0]?.body).toMatchObject({
      description: null,
    });
  });

  it("US3-4: código de barras de outro produto aparece no campo", async () => {
    seedClothes();
    const { user } = renderApp();
    const dialog = within(await openEdit(user, "Camiseta Básica Branca M"));

    await replaceText(
      user,
      dialog.getByRole("textbox", { name: "Código de barras" }),
      "7896543210982",
    );
    await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await dialog.findByText("Código de barras já cadastrado"),
    ).toBeVisible();
    expect(
      dialog.getByRole("textbox", { name: "Código de barras" }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("US3-5, FR-016: produto removido enquanto o painel estava aberto", async () => {
    const [camiseta] = seedClothes();
    const { user } = renderApp();
    const dialog = within(await openEdit(user, "Camiseta Básica Branca M"));

    catalog.remove(camiseta?.id ?? "");
    await user.click(dialog.getByRole("button", { name: "Salvar alterações" }));

    expect(
      await screen.findByText(
        "Este produto não existe mais. A lista foi atualizada.",
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("Camiseta Básica Branca M"),
      ).not.toBeInTheDocument(),
    );
  });

  it("US3-6: Cancelar e Esc não salvam nada", async () => {
    seedClothes();
    const { user } = renderApp();

    let dialog = within(await openEdit(user, "Camiseta Básica Branca M"));
    await replaceText(
      user,
      dialog.getByRole("textbox", { name: "Nome" }),
      "Outro nome",
    );
    await user.click(dialog.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    dialog = within(await openEdit(user, "Camiseta Básica Branca M"));
    expect(dialog.getByRole("textbox", { name: "Nome" })).toHaveValue(
      "Camiseta Básica Branca M",
    );
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    expect(catalog.requestsTo("PUT")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Editar Camiseta Básica Branca M" }),
    ).toHaveFocus();
  });

  it("FR-020: no celular, o menu de ações da linha abre a edição", async () => {
    setMediaMatches("(max-width: 639px)", true);
    seedClothes();
    const { user } = renderApp();

    await user.click(
      await screen.findByRole("button", {
        name: "Ações de Camiseta Básica Branca M",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));

    expect(
      await screen.findByRole("dialog", { name: "Editar produto" }),
    ).toBeVisible();
  });
});
