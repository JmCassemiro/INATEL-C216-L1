import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalog } from "../msw/catalog";
import { currentUrl, renderApp } from "../render";

describe("Layout do painel (FR-018)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // O TanStack Query também ouve o evento `offline` e pausa as consultas: volta ao normal.
    window.dispatchEvent(new Event("online"));
  });

  it("redireciona uma rota desconhecida para a página de entrada", async () => {
    const { router } = renderApp("/nao-existe");

    expect(
      await screen.findAllByRole("link", { name: "Abrir o painel" }),
    ).not.toHaveLength(0);
    expect(currentUrl(router)).toBe("/");
  });

  it("a barra superior tem o link de volta para o site", async () => {
    renderApp();

    const banner = await screen.findByRole("banner");
    expect(
      within(banner).getByRole("link", { name: "Ver o site" }),
    ).toHaveAttribute("href", "/");
  });

  it("mostra o menu lateral com a marca e as seções", async () => {
    renderApp();

    expect(
      await screen.findByRole("link", { name: "NexoPDV" }),
    ).toHaveAttribute("href", "/products");
    const sections = screen.getByRole("navigation", { name: "Seções" });
    expect(
      within(sections).getByRole("link", { name: "Produtos" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("mostra as seções futuras como 'em breve', sem link", async () => {
    renderApp();

    const sections = await screen.findByRole("navigation", { name: "Seções" });
    expect(within(sections).getByText("Estoque")).toBeVisible();
    expect(within(sections).getByText("Vendas")).toBeVisible();
    expect(within(sections).getAllByText("em breve")).toHaveLength(2);
    expect(within(sections).getAllByRole("link")).toHaveLength(1);
  });

  it("a barra superior tem a troca de tema e o botão do menu", async () => {
    renderApp();

    const banner = await screen.findByRole("banner");
    expect(
      within(banner).getByRole("button", { name: "Usar tema escuro" }),
    ).toBeVisible();
    expect(
      within(banner).getByRole("button", { name: "Abrir menu" }),
    ).toBeVisible();
  });

  it("o botão 'Abrir menu' mostra as seções numa gaveta, que fecha ao navegar", async () => {
    const { user } = renderApp();

    await user.click(await screen.findByRole("button", { name: "Abrir menu" }));

    const drawer = await screen.findByRole("dialog", { name: "Menu" });
    const sections = within(drawer).getByRole("navigation", { name: "Seções" });
    await user.click(within(sections).getByRole("link", { name: "Produtos" }));

    expect(screen.queryByRole("dialog", { name: "Menu" })).toBeNull();
  });

  it("mostra o estado da conexão e acompanha quando a internet cai", async () => {
    renderApp();

    const status = await screen.findByRole("status", { name: "Conexão" });
    expect(within(status).getByText("Conectado")).toBeVisible();

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(within(status).getByText("Sem internet")).toBeVisible();
  });

  it("mostra quantos produtos o catálogo tem no item do menu", async () => {
    catalog.seedMany(12);
    renderApp();

    const sections = await screen.findByRole("navigation", { name: "Seções" });
    expect(await within(sections).findByText("12")).toBeVisible();
  });

  it("tem uma região principal com o título da seção", async () => {
    renderApp();

    const main = await screen.findByRole("main");
    expect(
      within(main).getByRole("heading", { level: 1, name: "Produtos" }),
    ).toBeVisible();
  });
});
