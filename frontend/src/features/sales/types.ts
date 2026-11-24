/** Contrato da API de vendas (spec 004, contracts/sales-api.md). */

export type PaymentMethod = "cash" | "pix" | "credit_card" | "debit_card";

/** Valores em dinheiro como texto com duas casas ("87.50"), como o preço. */
export type Payment = { method: PaymentMethod; amount: string };

export type SaleItem = {
  product_id: string;
  /** Nome, código e preço do momento da venda. */
  name: string;
  barcode: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
};

export type Sale = {
  id: string;
  /** Número legível, crescente: "Venda nº 12". */
  number: number;
  /** ISO 8601 com fuso (UTC). */
  occurred_at: string;
  items: SaleItem[];
  payments: Payment[];
  total: string;
  paid: string;
  change: string;
  /** Unidades vendidas (soma das quantidades). */
  item_count: number;
};

export type SalePage = {
  items: Sale[];
  total: number;
  page: number;
  size: number;
};

export type SalesSummary = {
  count: number;
  revenue: string;
  average_ticket: string;
};

/** Corpo de `POST /sales`; `id` é criado pelo painel e torna o envio idempotente. */
export type SaleInput = {
  id: string;
  items: { product_id: string; quantity: number; unit_price: string }[];
  payments: Payment[];
};

export type SaleProblemReason =
  | "unavailable"
  | "price_changed"
  | "insufficient_stock";

/** Um item recusado na finalização (409, research D7). */
export type SaleProblem = {
  product_id: string;
  reason: SaleProblemReason;
  message: string;
  available?: number | null;
  current_price?: string | null;
};
