/**
 * Código de barras GTIN (EAN-8, UPC-A, EAN-13 e GTIN-14), com a mesma regra do
 * domínio do back-end (spec 002, FR-004). A API continua sendo a autoridade; aqui
 * a regra serve para o lojista ver o erro antes de enviar.
 */

const GTIN_FORMAT = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;

export const GTIN_MESSAGES = {
  required: "Informe o código de barras.",
  format: "Use só números: 8, 12, 13 ou 14 dígitos.",
  checkDigit: "Confira os dígitos: o código de barras não é válido.",
} as const;

/** Dígito verificador: pesos 3 e 1 alternados, da direita para a esquerda. */
export function gtinCheckDigit(body: string): number {
  const sum = [...body]
    .reverse()
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(code: string): boolean {
  return gtinError(code) === null;
}

/** A mensagem do problema no código, ou `null` se ele é um GTIN válido. */
export function gtinError(code: string): string | null {
  if (code === "") return GTIN_MESSAGES.required;
  if (!GTIN_FORMAT.test(code)) return GTIN_MESSAGES.format;
  const body = code.slice(0, -1);
  return gtinCheckDigit(body) === Number(code.at(-1))
    ? null
    : GTIN_MESSAGES.checkDigit;
}
