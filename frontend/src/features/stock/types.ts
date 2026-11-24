/** Contrato da API de estoque (spec 011, contracts/stock-api.md). */

export type MovementKind = "entry" | "adjustment";

export type StockMovement = {
  id: string;
  product_id: string;
  /** 1, 2, 3… por produto, na ordem em que os saldos foram aplicados. */
  sequence: number;
  kind: MovementKind;
  /** Com sinal: +24 numa entrada, −2 numa retirada. */
  quantity: number;
  balance_after: number;
  /** Observação da entrada ou motivo do ajuste. */
  note: string | null;
  /** ISO 8601 com fuso (UTC). */
  occurred_at: string;
};

export type MovementPage = {
  items: StockMovement[];
  total: number;
  page: number;
  size: number;
};

export type StockSummary = {
  restock_count: number;
  out_of_stock_count: number;
  /** Decimal com duas casas, como texto, igual ao preço. */
  stock_value: string;
};

/** Corpo de `POST /products/{id}/stock/entries`. */
export type EntryInput = { quantity: number; note: string | null };

/** Corpo de `POST /products/{id}/stock/adjustments`; quantidade com sinal. */
export type AdjustmentInput = { quantity: number; reason: string };
