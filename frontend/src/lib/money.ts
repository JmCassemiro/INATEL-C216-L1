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

export type PriceInputResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export const PRICE_MESSAGES = {
  required: "Informe o preço de venda.",
  format: "Use só números, com vírgula para os centavos.",
  zero: "Informe um preço maior que zero.",
  decimals: "Use no máximo duas casas decimais.",
  max: "O preço máximo é R$ 999.999,99.",
} as const;

/** Inteiro e, opcionalmente, centavos depois de vírgula ou ponto. */
const PRICE_FORMAT = /^(\d+)(?:[.,](\d+))?$/;

/**
 * Lê o preço digitado ("49,90" ou "49.90") e devolve o texto que a API espera
 * ("49.90"). As regras (maior que zero, até duas casas, até R$ 999.999,99) são
 * conferidas no próprio texto, sem converter para `float`.
 */
export function parsePriceInput(text: string): PriceInputResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: PRICE_MESSAGES.required };
  const match = PRICE_FORMAT.exec(trimmed);
  if (!match) return { ok: false, error: PRICE_MESSAGES.format };
  const [, rawInteger = "", decimals = ""] = match;
  if (decimals.length > 2) return { ok: false, error: PRICE_MESSAGES.decimals };

  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const cents = decimals.padEnd(2, "0");
  if (integer === "0" && cents === "00")
    return { ok: false, error: PRICE_MESSAGES.zero };
  // Até 999.999,99: a parte inteira tem no máximo seis dígitos.
  if (integer.length > 6) return { ok: false, error: PRICE_MESSAGES.max };
  return { ok: true, value: `${integer}.${cents}` };
}

/** Preço da API no campo do formulário de edição: "49.90" → "49,90". */
export function priceForInput(price: string): string {
  return price.replace(".", ",");
}
