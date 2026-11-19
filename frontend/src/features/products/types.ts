/** Contrato da API de produtos (spec 002, com as mudanças da 007). */

export type Product = {
  id: string;
  name: string;
  description: string | null;
  barcode: string;
  /** Decimal com duas casas, como texto ("49.90"); nunca vira `number` para cálculo. */
  price: string;
};

/** Corpo de POST e PUT. */
export type ProductInput = Omit<Product, "id">;

export type ProductField = keyof ProductInput;

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  size: number;
};
