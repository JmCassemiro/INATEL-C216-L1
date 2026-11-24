/**
 * Dados das vendas com TanStack Query (spec 004, research D17). Uma venda registrada
 * muda o histórico, os indicadores do dia, o saldo dos produtos e o estoque: tudo é
 * recarregado no fim, com sucesso ou não (o saldo pode ter mudado por outra venda).
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { todayRange } from "@/lib/date";
import { PRODUCTS_KEY, SALES_KEY, STOCK_KEY } from "@/lib/query-keys";
import { getSalesSummary, listSales, registerSale } from "./api";
import type { SaleInput } from "./types";

export const PAGE_SIZE = 10;

export function useSalesPage(page: number) {
  return useQuery({
    queryKey: [...SALES_KEY, "list", page],
    queryFn: () => listSales(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

/** Indicadores do dia corrente, no fuso do navegador (FR-023). */
export function useTodaySummary() {
  const range = todayRange();
  return useQuery({
    queryKey: [...SALES_KEY, "summary", range.start],
    queryFn: () => getSalesSummary(range),
  });
}

export function useRegisterSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaleInput) => registerSale(input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SALES_KEY }),
        queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
        queryClient.invalidateQueries({ queryKey: STOCK_KEY }),
      ]),
  });
}
