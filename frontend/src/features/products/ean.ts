/**
 * Codificação de EAN-13, UPC-A e EAN-8 em módulos ("1" = barra, "0" = espaço),
 * pelas tabelas da norma GS1 (research D10). GTIN-14 usa outro símbolo (ITF-14) e
 * não é desenhado; código inválido também não.
 */
import { isValidGtin } from "./gtin";

/** Tabela L (paridade ímpar), uma entrada por dígito de 0 a 9. */
const L_CODES = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

/** Tabela R: o complemento da L (cada 0 vira 1 e vice-versa). */
const R_CODES = L_CODES.map((code) =>
  [...code].map((bit) => (bit === "1" ? "0" : "1")).join(""),
);

/** Tabela G (paridade par): a R espelhada. */
const G_CODES = R_CODES.map((code) => [...code].reverse().join(""));

/** No EAN-13, o primeiro dígito não vira barra: ele escolhe L ou G para os seis seguintes. */
const FIRST_DIGIT_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

const START_END_GUARD = "101";
const CENTER_GUARD = "01010";

function codeFor(table: string[], digit: number): string {
  const code = table[digit];
  if (code === undefined) throw new Error(`Dígito fora da tabela: ${digit}`);
  return code;
}

function digitsOf(code: string): number[] {
  return [...code].map(Number);
}

function encodeEan13(code: string): string {
  const [first = 0, ...rest] = digitsOf(code);
  const parity = codeFor(FIRST_DIGIT_PARITY, first);
  const left = rest
    .slice(0, 6)
    .map((digit, index) =>
      codeFor(parity[index] === "L" ? L_CODES : G_CODES, digit),
    )
    .join("");
  const right = rest
    .slice(6)
    .map((digit) => codeFor(R_CODES, digit))
    .join("");
  return START_END_GUARD + left + CENTER_GUARD + right + START_END_GUARD;
}

function encodeEan8(code: string): string {
  const digits = digitsOf(code);
  const left = digits
    .slice(0, 4)
    .map((digit) => codeFor(L_CODES, digit))
    .join("");
  const right = digits
    .slice(4)
    .map((digit) => codeFor(R_CODES, digit))
    .join("");
  return START_END_GUARD + left + CENTER_GUARD + right + START_END_GUARD;
}

export function encodeEan(code: string): string | null {
  if (!isValidGtin(code)) return null;
  switch (code.length) {
    case 13:
      return encodeEan13(code);
    case 12:
      // UPC-A é o EAN-13 com um zero à esquerda.
      return encodeEan13(`0${code}`);
    case 8:
      return encodeEan8(code);
    default:
      return null;
  }
}
