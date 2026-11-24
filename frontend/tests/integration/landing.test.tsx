import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { currentUrl, renderApp } from "../render";

const HEADLINE = "O caixa da sua loja não para. Nem quando a internet cai.";

function featureCard(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 3, name });
  const card = heading.closest("article");
  if (!card) throw new Error(`Cartão "${name}" sem <article>`);
  return card;
}

describe("Página de entrada", () => {
  it("abre em / com a manchete, sem redirecionar", async () => {
    const { router } = renderApp("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: HEADLINE }),
    ).toBeVisible();
    expect(currentUrl(router)).toBe("/");
  });

  it("a chamada principal leva ao painel de produtos", async () => {
    const { user, router } = renderApp("/");

    const [cta] = await screen.findAllByRole("link", {
      name: "Abrir o painel",
    });
    await user.click(cta as HTMLElement);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Produtos" }),
    ).toBeVisible();
    expect(currentUrl(router)).toBe("/products");
  });

  it("a navegação do site tem a marca e os atalhos das seções da página", async () => {
    renderApp("/");

    const nav = await screen.findByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "NexoPDV" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(nav).getByRole("link", { name: "Recursos" })).toHaveAttribute(
      "href",
      "#recursos",
    );
    expect(
      within(nav).getByRole("link", { name: "Como funciona" }),
    ).toHaveAttribute("href", "#offline");
  });

  it("separa o que já existe do que vem nas próximas versões", async () => {
    renderApp("/");

    await screen.findByRole("heading", {
      level: 2,
      name: /Tudo o que o balcão/,
    });
    expect(featureCard("Catálogo de produtos")).toHaveTextContent("Disponível");
    expect(featureCard("Etiqueta de gôndola")).toHaveTextContent("Disponível");
    expect(featureCard("Frente de caixa")).toHaveTextContent("Em breve");
    expect(featureCard("Estoque com alerta")).toHaveTextContent("Em breve");
  });

  it("explica o offline em três passos", async () => {
    renderApp("/");

    const section = await screen.findByRole("region", {
      name: "Como o caixa funciona sem internet",
    });
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
  });
});
