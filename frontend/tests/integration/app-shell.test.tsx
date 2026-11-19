import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { currentUrl, renderApp } from "../render";

describe("Layout do painel (FR-018)", () => {
  it("redireciona / para /products", async () => {
    const { router } = renderApp("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Produtos" }),
    ).toBeVisible();
    expect(currentUrl(router)).toBe("/products");
  });

  it("redireciona uma rota desconhecida para /products", async () => {
    const { router } = renderApp("/nao-existe");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Produtos" }),
    ).toBeVisible();
    expect(currentUrl(router)).toBe("/products");
  });

  it("mostra a barra com a marca e a navegação de seções", async () => {
    renderApp();

    const banner = await screen.findByRole("banner");
    expect(
      within(banner).getByRole("link", { name: "NexoPDV" }),
    ).toHaveAttribute("href", "/products");
    const sections = within(banner).getByRole("navigation", { name: "Seções" });
    expect(
      within(sections).getByRole("link", { name: "Produtos" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("tem uma região principal com o título da seção", async () => {
    renderApp();

    const main = await screen.findByRole("main");
    expect(
      within(main).getByRole("heading", { level: 1, name: "Produtos" }),
    ).toBeVisible();
  });
});
