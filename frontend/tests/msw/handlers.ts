/** Rotas da API simulada: cada uma registra a requisição e delega ao catálogo falso. */
import { HttpResponse, http } from "msw";
import type { ProductInput, ProductSort } from "@/features/products/types";
import type { SaleInput } from "@/features/sales/types";
import type { AdjustmentInput, EntryInput } from "@/features/stock/types";
import { API_URL } from "@/lib/api-client";
import { type CatalogResult, catalog } from "./catalog";

export const PRODUCTS_URL = `${API_URL}/products`;
export const STOCK_SUMMARY_URL = `${API_URL}/stock/summary`;
export const SALES_URL = `${API_URL}/sales`;

function respond(result: CatalogResult) {
  if (result.status === 204) return new HttpResponse(null, { status: 204 });
  return HttpResponse.json(result.body as object, { status: result.status });
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
        sort: (url.searchParams.get("sort") ?? undefined) as
          | ProductSort
          | undefined,
        restock: url.searchParams.get("restock") === "true",
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

  http.post(
    `${PRODUCTS_URL}/:id/stock/entries`,
    async ({ request, params }) => {
      const body = (await request.json()) as EntryInput;
      const id = String(params.id);
      catalog.record({
        method: "POST",
        path: `/products/${id}/stock/entries`,
        body,
      });
      return respond(catalog.enter(id, body));
    },
  ),

  http.post(
    `${PRODUCTS_URL}/:id/stock/adjustments`,
    async ({ request, params }) => {
      const body = (await request.json()) as AdjustmentInput;
      const id = String(params.id);
      catalog.record({
        method: "POST",
        path: `/products/${id}/stock/adjustments`,
        body,
      });
      return respond(catalog.adjust(id, body));
    },
  ),

  http.get(`${PRODUCTS_URL}/:id/stock/movements`, ({ request, params }) => {
    const url = new URL(request.url);
    const id = String(params.id);
    catalog.record({
      method: "GET",
      path: url.pathname + url.search,
      body: null,
    });
    return respond(
      catalog.movementsOf(
        id,
        Number(url.searchParams.get("page") ?? 1),
        Number(url.searchParams.get("size") ?? 20),
      ),
    );
  }),

  http.get(STOCK_SUMMARY_URL, () => {
    catalog.record({ method: "GET", path: "/stock/summary", body: null });
    return HttpResponse.json(catalog.summary());
  }),

  http.get(`${PRODUCTS_URL}/barcode/:code`, ({ params }) => {
    const code = String(params.code);
    catalog.record({
      method: "GET",
      path: `/products/barcode/${code}`,
      body: null,
    });
    return respond(catalog.byBarcode(code));
  }),

  http.post(SALES_URL, async ({ request }) => {
    const body = (await request.json()) as SaleInput;
    catalog.record({ method: "POST", path: "/sales", body });
    return respond(catalog.registerSale(body));
  }),

  http.get(SALES_URL, ({ request }) => {
    const url = new URL(request.url);
    catalog.record({
      method: "GET",
      path: url.pathname + url.search,
      body: null,
    });
    return HttpResponse.json(
      catalog.listSales(
        Number(url.searchParams.get("page") ?? 1),
        Number(url.searchParams.get("size") ?? 20),
      ),
    );
  }),

  // Antes de `/sales/:id`, para "summary" não ser lido como um id.
  http.get(`${SALES_URL}/summary`, ({ request }) => {
    const url = new URL(request.url);
    catalog.record({
      method: "GET",
      path: url.pathname + url.search,
      body: null,
    });
    return HttpResponse.json(
      catalog.salesSummary(
        url.searchParams.get("start") ?? "",
        url.searchParams.get("end") ?? "",
      ),
    );
  }),

  http.get(`${SALES_URL}/:id`, ({ params }) => {
    const id = String(params.id);
    catalog.record({ method: "GET", path: `/sales/${id}`, body: null });
    return respond(catalog.getSale(id));
  }),
];
