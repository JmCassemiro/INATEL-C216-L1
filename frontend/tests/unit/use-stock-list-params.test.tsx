import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { useStockListParams } from "@/features/stock/use-stock-list-params";

function renderParams(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const location = useLocation();
      return {
        ...useStockListParams(),
        url: location.pathname + location.search,
      };
    },
    { wrapper },
  );
}

describe("useStockListParams (spec 011, FR-017, data-model §4)", () => {
  it("lê busca, página e visão da URL", () => {
    const { result } = renderParams("/stock?search=camis&page=2&view=restock");

    expect(result.current.search).toBe("camis");
    expect(result.current.page).toBe(2);
    expect(result.current.view).toBe("restock");
  });

  it.each(["/stock", "/stock?view=todos"])(
    "sem visão válida (%s), mostra todos",
    (url) => {
      expect(renderParams(url).result.current.view).toBe("all");
    },
  );

  it("trocar para 'Para repor' grava a visão e volta à página 1", () => {
    const { result } = renderParams("/stock?search=camis&page=3");

    act(() => result.current.setView("restock"));

    expect(result.current.url).toBe("/stock?search=camis&view=restock");
  });

  it("voltar para 'Todos' tira a visão da URL", () => {
    const { result } = renderParams("/stock?view=restock&page=2");

    act(() => result.current.setView("all"));

    expect(result.current.url).toBe("/stock");
  });
});
