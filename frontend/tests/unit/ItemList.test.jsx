import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemList } from "../../src/components/ItemList";

describe("ItemList", () => {
  it("mostra o estado vazio sem itens", () => {
    render(<ItemList items={[]} />);
    expect(screen.getByText("Nenhum item cadastrado.")).toBeInTheDocument();
  });

  it("lista os itens com nome e descrição", () => {
    const items = [
      { id: "1", name: "Notebook", description: "14 polegadas" },
      { id: "2", name: "Mouse", description: "" },
    ];
    render(<ItemList items={items} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("14 polegadas")).toBeInTheDocument();
    expect(screen.getByText("Mouse")).toBeInTheDocument();
  });
});
