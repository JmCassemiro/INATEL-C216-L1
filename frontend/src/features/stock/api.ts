/** Operações da API de estoque usadas pelo painel (contracts/stock-api.md). */
import { apiRequest } from "@/lib/api-client";
import type {
  AdjustmentInput,
  EntryInput,
  MovementPage,
  StockMovement,
  StockSummary,
} from "./types";

export function registerEntry(
  productId: string,
  input: EntryInput,
): Promise<StockMovement> {
  return apiRequest<StockMovement>(`/products/${productId}/stock/entries`, {
    method: "POST",
    body: input,
  });
}

export function adjustStock(
  productId: string,
  input: AdjustmentInput,
): Promise<StockMovement> {
  return apiRequest<StockMovement>(`/products/${productId}/stock/adjustments`, {
    method: "POST",
    body: input,
  });
}

export function listMovements(
  productId: string,
  page: number,
  size: number,
): Promise<MovementPage> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  return apiRequest<MovementPage>(
    `/products/${productId}/stock/movements?${query}`,
  );
}

export function getStockSummary(): Promise<StockSummary> {
  return apiRequest<StockSummary>("/stock/summary");
}
