/**
 * Validação do formulário de produto (FR-009), com as mesmas regras do catálogo
 * (spec 002) e o estoque mínimo da spec 011. Os campos chegam como texto, do jeito
 * que foram digitados.
 */
import { parsePriceInput } from "@/lib/money";
import { parseQuantity } from "@/lib/quantity";
import { gtinError } from "./gtin";
import type { ProductField, ProductInput } from "./types";

export type ProductFormValues = Record<ProductField, string>;
export type ProductFormErrors = Partial<Record<ProductField, string>>;

export type ProductFormResult =
  | { ok: true; input: ProductInput }
  | { ok: false; errors: ProductFormErrors };

const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;
/** Mínimo vazio vale 0: o lojista não controla o mínimo desse produto. */
const MIN_STOCK = { min: 0, max: 99_999, emptyAs: 0 };

export function validateProductForm(
  values: ProductFormValues,
): ProductFormResult {
  const errors: ProductFormErrors = {};

  const name = values.name.trim();
  if (name === "") errors.name = "Informe o nome do produto.";
  else if (name.length > NAME_MAX)
    errors.name = `Use no máximo ${NAME_MAX} caracteres.`;

  const description = values.description.trim();
  if (description.length > DESCRIPTION_MAX)
    errors.description = `Use no máximo ${DESCRIPTION_MAX} caracteres.`;

  const barcode = values.barcode.trim();
  const barcodeError = gtinError(barcode);
  if (barcodeError) errors.barcode = barcodeError;

  const price = parsePriceInput(values.price);
  if (!price.ok) errors.price = price.error;

  const minStock = parseQuantity(values.min_stock, MIN_STOCK);
  if (!minStock.ok) errors.min_stock = minStock.error;

  if (!price.ok || !minStock.ok || Object.keys(errors).length > 0)
    return { ok: false, errors };
  return {
    ok: true,
    input: {
      name,
      description: description || null,
      barcode,
      price: price.value,
      min_stock: minStock.value,
    },
  };
}
