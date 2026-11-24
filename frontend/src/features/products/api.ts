/** Operações da API de produtos usadas pelo painel (contracts/products-api-changes.md). */
import { apiRequest } from "@/lib/api-client";
import type { Product, ProductInput, ProductPage, ProductSort } from "./types";

/**
 * Página do catálogo. A seção Estoque pede `sort` e `restock` (spec 011); sem eles,
 * vale o padrão da API: todos, do mais recente para o mais antigo.
 */
export function listProducts(params: {
  search: string;
  page: number;
  size: number;
  sort?: ProductSort;
  restock?: boolean;
}): Promise<ProductPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.search) query.set("name", params.search);
  if (params.sort) query.set("sort", params.sort);
  if (params.restock) query.set("restock", "true");
  return apiRequest<ProductPage>(`/products?${query}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiRequest<Product>("/products", { method: "POST", body: input });
}

export function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, { method: "PUT", body: input });
}

export function removeProduct(id: string): Promise<void> {
  return apiRequest<void>(`/products/${id}`, { method: "DELETE" });
}
