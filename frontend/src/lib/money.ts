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

/** "49.90" → 4990. Centavos inteiros: somar e comparar sem erro de arredondamento. */
export function toCents(price: string): number {
  const { integer, cents } = splitPrice(price);
  return Number(integer.replaceAll(".", "")) * 100 + Number(cents);
}

/** 4990 → "49.90". */
export function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** 123456 → "R$ 1.234,56". */
export function formatCents(cents: number): string {
  return formatPrice(fromCents(cents));
}

export const MONEY_MESSAGES = {
  required: "Informe o valor.",
  format: PRICE_MESSAGES.format,
  zero: "Informe um valor maior que zero.",
  decimals: PRICE_MESSAGES.decimals,
  max: "O valor máximo é R$ 999.999,99.",
} as const;

/** Inteiro com pontos de milhar: "1.234" ou "999.999". */
const GROUPED = /^\d{1,3}(?:\.\d{3})+$/;
/** Sem vírgula, um ponto seguido de uma ou duas casas é o decimal: "49.90". */
const DOT_DECIMAL = /^(\d+)\.(\d{1,2})$/;

/**
 * Lê um valor em reais digitado no caixa (spec 004, research D14) e devolve o texto
 * que a API espera ("1234.56"). Aceita "100", "87,5", "49.90" e "1.234,56": com
 * vírgula, os pontos são de milhar; sem vírgula, só "1.234" (milhar) ou "49.90"
 * (decimal). Nada de `float`: as regras são conferidas no próprio texto.
 */
export function parseMoneyInput(text: string): PriceInputResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: MONEY_MESSAGES.required };
  const parts = splitMoney(trimmed);
  if (!parts) return { ok: false, error: MONEY_MESSAGES.format };
  const { integer: rawInteger, decimals } = parts;
  if (decimals.length > 2) return { ok: false, error: MONEY_MESSAGES.decimals };

  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const cents = decimals.padEnd(2, "0");
  if (integer === "0" && cents === "00")
    return { ok: false, error: MONEY_MESSAGES.zero };
  if (integer.length > 6) return { ok: false, error: MONEY_MESSAGES.max };
  return { ok: true, value: `${integer}.${cents}` };
}

function splitMoney(
  text: string,
): { integer: string; decimals: string } | null {
  const commaParts = text.split(",");
  if (commaParts.length > 2) return null;
  if (commaParts.length === 2) {
    const [integer = "", decimals = ""] = commaParts;
    const validInteger = /^\d+$/.test(integer) || GROUPED.test(integer);
    if (!validInteger || !/^\d+$/.test(decimals)) return null;
    return { integer: integer.replaceAll(".", ""), decimals };
  }
  const dotDecimal = DOT_DECIMAL.exec(text);
  if (dotDecimal)
    return { integer: dotDecimal[1] ?? "", decimals: dotDecimal[2] ?? "" };
  if (GROUPED.test(text))
    return { integer: text.replaceAll(".", ""), decimals: "" };
  if (/^\d+$/.test(text)) return { integer: text, decimals: "" };
  return null;
}

/** Média dos preços, arredondando meio centavo para cima; `null` sem preços. */
export function averagePrice(prices: string[]): string | null {
  if (prices.length === 0) return null;
  const total = prices.reduce((sum, price) => sum + toCents(price), 0);
  return fromCents(Math.round(total / prices.length));
}

/** Menor e maior preço; `null` sem preços. */
export function priceRange(
  prices: string[],
): { min: string; max: string } | null {
  if (prices.length === 0) return null;
  const cents = prices.map(toCents);
  return {
    min: fromCents(Math.min(...cents)),
    max: fromCents(Math.max(...cents)),
  };
}

/** Preço da API no campo do formulário de edição: "49.90" → "49,90". */
export function priceForInput(price: string): string {
  return price.replace(".", ",");
}
