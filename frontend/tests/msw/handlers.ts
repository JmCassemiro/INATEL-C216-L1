/** Rotas da API simulada: cada uma registra a requisição e delega ao catálogo falso. */
import { HttpResponse, http } from "msw";
import type { ProductInput } from "@/features/products/types";
import { API_URL } from "@/lib/api-client";
import { type CatalogResult, catalog } from "./catalog";

export const PRODUCTS_URL = `${API_URL}/products`;

function respond(result: CatalogResult) {
  if (result.status === 204) return new HttpResponse(null, { status: 204 });
  return HttpResponse.json(result.body, { status: result.status });
}

export const handlers = [
  http.get(PRODUCTS_URL, ({ request }) => {
    const url = new URL(request.url);
    catalog.record({
      method: "GET",
      path: url.pathname + url.search,
      body: null,
    });
    return HttpResponse.json(
      catalog.list({
        page: Number(url.searchParams.get("page") ?? 1),
        size: Number(url.searchParams.get("size") ?? 20),
        name: url.searchParams.get("name") ?? "",
      }),
    );
  }),

  http.post(PRODUCTS_URL, async ({ request }) => {
    const body = (await request.json()) as ProductInput;
    catalog.record({ method: "POST", path: "/products", body });
    return respond(catalog.create(body));
  }),

  http.put(`${PRODUCTS_URL}/:id`, async ({ request, params }) => {
    const body = (await request.json()) as ProductInput;
    const id = String(params.id);
    catalog.record({ method: "PUT", path: `/products/${id}`, body });
    return respond(catalog.update(id, body));
  }),

  http.delete(`${PRODUCTS_URL}/:id`, ({ params }) => {
    const id = String(params.id);
    catalog.record({ method: "DELETE", path: `/products/${id}`, body: null });
    return respond(catalog.remove(id));
  }),
];
