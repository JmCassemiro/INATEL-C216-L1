/**
 * Quantidades de estoque digitadas como texto (spec 011, research D15). Só inteiros,
 * com ponto opcional como separador de milhar ("1.000"); vírgula, sinal, fração e
 * notação científica são recusados. `type="number"` não é usado: aceita "1e3", muda o
 * valor com a rolagem do mouse e não entende o milhar brasileiro.
 */

export type QuantityResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export type QuantityLimits = {
  min: number;
  max: number;
  /** Valor usado quando o campo fica vazio; sem ele, o campo é obrigatório. */
  emptyAs?: number;
};

const PLAIN = /^\d+$/;
const THOUSANDS = /^\d{1,3}(\.\d{3})+$/;
const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function parseQuantity(
  text: string,
  { min, max, emptyAs }: QuantityLimits,
): QuantityResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return emptyAs === undefined
      ? { ok: false, error: "Informe a quantidade." }
      : { ok: true, value: emptyAs };
  }
  if (!PLAIN.test(trimmed) && !THOUSANDS.test(trimmed)) {
    return { ok: false, error: "Use só números inteiros, como 24 ou 1.000." };
  }
  const value = Number(trimmed.replaceAll(".", ""));
  if (value < min) {
    return {
      ok: false,
      error:
        min === 1
          ? "A quantidade deve ser maior que zero."
          : `Use no mínimo ${formatQuantity(min)}.`,
    };
  }
  if (value > max) {
    return { ok: false, error: `Use no máximo ${formatQuantity(max)}.` };
  }
  return { ok: true, value };
}

/** Inteiro no formato brasileiro: 1500 → "1.500". */
export function formatQuantity(value: number): string {
  return NUMBER.format(value);
}

/** Quantidade com a unidade abreviada: 1500 → "1.500 un.". */
export function formatUnits(value: number): string {
  return `${formatQuantity(value)} un.`;
}
