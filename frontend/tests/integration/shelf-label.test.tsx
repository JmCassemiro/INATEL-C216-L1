import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { renderApp } from "../render";

describe("Prévia da etiqueta de gôndola (FR-022)", () => {
  it("acompanha o que o lojista digita e só desenha as barras de um código válido", async () => {
    const { user } = renderApp();
    await user.click(
      await screen.findByRole("button", { name: "Novo produto" }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "Novo produto" }),
    );

    await user.type(
      dialog.getByRole("textbox", { name: "Nome" }),
      "Camiseta Básica Branca M",
    );
    await user.type(
      dialog.getByRole("textbox", { name: "Código de barras" }),
      "7891000315507",
    );
    await user.type(
      dialog.getByRole("textbox", { name: "Preço de venda" }),
      "49,90",
    );

    const preview = within(
      dialog.getByRole("figure", { name: "Prévia da etiqueta" }),
    );
    expect(preview.getByText("Camiseta Básica Branca M")).toBeVisible();
    expect(preview.getByText("R$ 49,90")).toBeInTheDocument();
    expect(
      preview.getByRole("img", { name: "Código de barras 7891000315507" }),
    ).toBeVisible();

    const barcode = dialog.getByRole("textbox", { name: "Código de barras" });
    await user.clear(barcode);
    await user.type(barcode, "7891000315508");

    expect(preview.queryByRole("img")).not.toBeInTheDocument();
    expect(preview.getByText("7891000315508")).toBeVisible();
  });

  it("no modo edição, abre com a etiqueta do produto", async () => {
    catalog.seed({
      name: "Calça Jeans Azul 42",
      barcode: "7896543210982",
      price: "159.90",
    });
    const { user } = renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Editar Calça Jeans Azul 42" }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "Editar produto" }),
    );
    const preview = within(
      dialog.getByRole("figure", { name: "Prévia da etiqueta" }),
    );

    expect(preview.getByText("Calça Jeans Azul 42")).toBeVisible();
    expect(preview.getByText("R$ 159,90")).toBeInTheDocument();
    expect(
      preview.getByRole("img", { name: "Código de barras 7896543210982" }),
    ).toBeVisible();
  });
});
