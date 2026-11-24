import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { useListParams } from "@/lib/use-list-params";

function renderParams(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const location = useLocation();
      return {
        ...useListParams(),
        url: location.pathname + location.search,
      };
    },
    { wrapper },
  );
}

describe("useListParams (FR-003, FR-004, data-model §3)", () => {
  it("lê a busca e a página da URL", () => {
    const { result } = renderParams("/products?search=camis&page=2");

    expect(result.current.search).toBe("camis");
    expect(result.current.page).toBe(2);
  });

  it("sem parâmetros, busca vazia e página 1", () => {
    const { result } = renderParams("/products");

    expect(result.current.search).toBe("");
    expect(result.current.page).toBe(1);
  });

  it.each(["abc", "0", "-3", "1.5"])("página inválida (%s) vira 1", (page) => {
    const { result } = renderParams(`/products?page=${page}`);

    expect(result.current.page).toBe(1);
  });

  it("buscar grava o termo sem espaços nas pontas e volta à página 1", () => {
    const { result } = renderParams("/products?page=3");

    act(() => result.current.setSearch("  camis "));

    expect(result.current.url).toBe("/products?search=camis");
    expect(result.current.page).toBe(1);
  });

  it("busca vazia sai da URL", () => {
    const { result } = renderParams("/products?search=camis");

    act(() => result.current.setSearch("   "));

    expect(result.current.url).toBe("/products");
  });

  it("mudar de página grava a página e mantém a busca", () => {
    const { result } = renderParams("/products?search=camis");

    act(() => result.current.setPage(3));

    expect(result.current.url).toBe("/products?search=camis&page=3");
  });

  it("a página 1 não aparece na URL", () => {
    const { result } = renderParams("/products?page=3");

    act(() => result.current.setPage(1));

    expect(result.current.url).toBe("/products");
  });
});
