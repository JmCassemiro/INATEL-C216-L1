/** Operações da API usadas pela frente de caixa e pelo histórico (contracts/sales-api.md). */
import type { Product } from "@/features/products/types";
import { apiRequest } from "@/lib/api-client";
import type { Sale, SaleInput, SalePage, SalesSummary } from "./types";

/** Produto ativo com esse código de barras (`GET /products/barcode/{código}`). */
export function findProductByBarcode(barcode: string): Promise<Product> {
  return apiRequest<Product>(
    `/products/barcode/${encodeURIComponent(barcode)}`,
  );
}

/** 201 quando a venda é criada; 200 quando o mesmo id já estava registrado. */
export function registerSale(input: SaleInput): Promise<Sale> {
  return apiRequest<Sale>("/sales", { method: "POST", body: input });
}

export function listSales(page: number, size: number): Promise<SalePage> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiRequest<SalePage>(`/sales?${query}`);
}

export function getSalesSummary(range: {
  start: string;
  end: string;
}): Promise<SalesSummary> {
  const query = new URLSearchParams(range);
  return apiRequest<SalesSummary>(`/sales/summary?${query}`);
}
