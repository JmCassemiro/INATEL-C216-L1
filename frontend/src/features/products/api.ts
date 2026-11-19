/** Operações da API de produtos usadas pelo painel (contracts/products-api-changes.md). */
import { apiRequest } from "@/lib/api-client";
import type { Product, ProductInput, ProductPage } from "./types";

export function listProducts(params: {
  search: string;
  page: number;
  size: number;
}): Promise<ProductPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.search) query.set("name", params.search);
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
