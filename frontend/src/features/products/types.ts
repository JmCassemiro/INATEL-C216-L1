/** Contrato da API de produtos (spec 002, com as mudanças das specs 007 e 011). */

/** Situação do estoque calculada pela API (spec 011, FR-013 e FR-015). */
export type StockStatus = "out_of_stock" | "restock" | "ok";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  barcode: string;
  /** Decimal com duas casas, como texto ("49.90"); nunca vira `number` para cálculo. */
  price: string;
  /** Saldo atual; só muda por movimentação de estoque. */
  stock_quantity: number;
  min_stock: number;
  /** Quanto falta para o mínimo (0 quando não falta nada). */
  shortfall: number;
  stock_status: StockStatus;
};

/** Corpo de POST e PUT. O saldo não entra pelo cadastro (spec 011, FR-002). */
export type ProductInput = {
  name: string;
  description: string | null;
  barcode: string;
  price: string;
  min_stock: number;
};

export type ProductField = keyof ProductInput;

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  size: number;
};

/** Ordens da listagem (spec 011, contracts/stock-api.md §1). */
export type ProductSort = "newest" | "name" | "shortfall";
