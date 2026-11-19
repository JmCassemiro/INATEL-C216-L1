import { useCallback } from "react";
import { useSearchParams } from "react-router";

/** Página da URL: só inteiros ≥ 1; qualquer outra coisa vira 1 (data-model §3). */
function parsePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}

/**
 * Busca e página da lista guardadas na URL (FR-004): recarregar, voltar ou abrir o
 * mesmo endereço mostra a mesma visão. A página 1 e a busca vazia não aparecem.
 */
export function useProductListParams() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const page = parsePage(params.get("page"));

  /** Termo novo: volta à página 1; substitui o histórico (cada tecla não é um "voltar"). */
  const setSearch = useCallback(
    (term: string) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const trimmed = term.trim();
          if (trimmed) next.set("search", trimmed);
          else next.delete("search");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setPage = useCallback(
    (value: number, options: { replace?: boolean } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value <= 1) next.delete("page");
          else next.set("page", String(value));
          return next;
        },
        { replace: options.replace },
      );
    },
    [setParams],
  );

  return { search, page, setSearch, setPage };
}
