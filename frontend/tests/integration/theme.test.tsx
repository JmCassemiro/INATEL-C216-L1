import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setMediaMatches } from "../browser";
import { renderApp } from "../render";

const DARK_SCHEME = "(prefers-color-scheme: dark)";
const root = document.documentElement;

describe("Tema claro e escuro (FR-019)", () => {
  it("sem escolha salva, segue o tema claro do sistema", async () => {
    renderApp();

    expect(
      await screen.findByRole("button", { name: "Usar tema escuro" }),
    ).toBeVisible();
    expect(root).not.toHaveClass("dark");
  });

  it("sem escolha salva, segue o tema escuro do sistema", async () => {
    setMediaMatches(DARK_SCHEME, true);

    renderApp();

    expect(
      await screen.findByRole("button", { name: "Usar tema claro" }),
    ).toBeVisible();
    expect(root).toHaveClass("dark");
  });

  it("o botão troca o tema e lembra a escolha", async () => {
    const { user } = renderApp();

    await user.click(
      await screen.findByRole("button", { name: "Usar tema escuro" }),
    );

    expect(root).toHaveClass("dark");
    expect(
      screen.getByRole("button", { name: "Usar tema claro" }),
    ).toBeVisible();
    expect(localStorage.getItem("nexopdv-theme")).toBe("dark");
  });

  it("com o tema escuro salvo, a aplicação já abre escura", async () => {
    localStorage.setItem("nexopdv-theme", "dark");

    renderApp();

    expect(
      await screen.findByRole("button", { name: "Usar tema claro" }),
    ).toBeVisible();
    expect(root).toHaveClass("dark");
  });
});
