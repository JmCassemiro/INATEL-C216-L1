/**
 * Dados do estoque com TanStack Query (spec 011, research D13). A posição de estoque é
 * o próprio catálogo (`GET /products`) com outra ordem e filtro, então ela fica sob a
 * chave de produtos e é recarregada junto com eles.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listProducts } from "@/features/products/api";
import { PRODUCTS_KEY, STOCK_KEY } from "@/lib/query-keys";
import {
  adjustStock,
  getStockSummary,
  listMovements,
  registerEntry,
} from "./api";
import type { AdjustmentInput, EntryInput } from "./types";

export const PAGE_SIZE = 10;

/** `all`: todos em ordem alfabética; `restock`: só os para repor, maior falta antes. */
export type StockView = "all" | "restock";

export function useStockPage(search: string, page: number, view: StockView) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, { search, page, view }],
    queryFn: () =>
      listProducts({
        search,
        page,
        size: PAGE_SIZE,
        sort: view === "restock" ? "shortfall" : "name",
        restock: view === "restock",
      }),
    placeholderData: keepPreviousData,
  });
}

export function useStockSummary() {
  return useQuery({
    queryKey: [...STOCK_KEY, "summary"],
    queryFn: getStockSummary,
  });
}

export function useMovements(productId: string | null, page: number) {
  return useQuery({
    queryKey: [...STOCK_KEY, "movements", productId, page],
    queryFn: () => listMovements(productId ?? "", page, PAGE_SIZE),
    enabled: productId !== null,
    placeholderData: keepPreviousData,
  });
}

/**
 * Toda movimentação muda o saldo listado, a reposição, os indicadores e o histórico:
 * recarrega produtos e estoque no fim, com sucesso ou não (o produto pode ter sumido).
 */
function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
      queryClient.invalidateQueries({ queryKey: STOCK_KEY }),
    ]);
}

export function useRegisterEntry() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: EntryInput;
    }) => registerEntry(productId, input),
    onSettled: invalidate,
  });
}

export function useAdjustStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: AdjustmentInput;
    }) => adjustStock(productId, input),
    onSettled: invalidate,
  });
}
