import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { useListParams } from "@/lib/use-list-params";
import type { StockView } from "./queries";

/**
 * Busca, página e visão da seção Estoque na URL (spec 011, FR-017). A visão "Para
 * repor" é `?view=restock`; a padrão (todos) não aparece. Trocar a visão volta à
 * página 1.
 */
export function useStockListParams() {
  const list = useListParams();
  const [params, setParams] = useSearchParams();
  const view: StockView = params.get("view") === "restock" ? "restock" : "all";

  const setView = useCallback(
    (value: StockView) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value === "restock") next.set("view", "restock");
        else next.delete("view");
        next.delete("page");
        return next;
      });
    },
    [setParams],
  );

  return { ...list, view, setView };
}
