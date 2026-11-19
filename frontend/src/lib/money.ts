/**
 * Preço sempre como texto ("1234.50"), do jeito que a API envia: nada de `float`,
 * para não haver erro de arredondamento (data-model §2).
 */

/** Ponto a cada três dígitos a partir da direita: "1234" → "1.234". */
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/** Partes da etiqueta de preço: inteiro com milhar e centavos com dois dígitos. */
export function splitPrice(price: string): { integer: string; cents: string } {
  const [integer = "0", cents = ""] = price.split(".");
  return {
    integer: integer.replace(THOUSANDS, "."),
    cents: cents.padEnd(2, "0").slice(0, 2),
  };
}

/** "1234.50" → "R$ 1.234,50". */
export function formatPrice(price: string): string {
  const { integer, cents } = splitPrice(price);
  return `R$ ${integer},${cents}`;
}
