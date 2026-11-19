import { describe, expect, it } from "vitest";
import { encodeEan } from "@/features/products/ean";

/*
 * Padrões de referência (1 = barra, 0 = espaço) gerados à parte, com a biblioteca
 * Python `python-barcode`, e não com o código testado (research D10).
 */
const EAN13_5901234123457 =
  "10100010110100111011001100100110111101001110101010110011011011001000010101110010011101000100101";
const EAN13_7891000315507 =
  "10101101110010111001100101001110001101010011101010100001011001101001110100111011100101000100101";
const EAN8_96385074 =
  "1010001011010111101111010110111010101001110111001010001001011100101";
const UPCA_036000291452 =
  "10100011010111101010111100011010001101000110101010110110011101001100110101110010011101101100101";

describe("encodeEan (FR-022)", () => {
  it.each([
    ["5901234123457", EAN13_5901234123457],
    ["7891000315507", EAN13_7891000315507],
  ])("codifica o EAN-13 %s nos 95 módulos de referência", (code, pattern) => {
    expect(encodeEan(code)).toBe(pattern);
  });

  it("tem as guardas de início, meio e fim", () => {
    const modules = encodeEan("7891000315507") ?? "";

    expect(modules).toHaveLength(95);
    expect(modules.slice(0, 3)).toBe("101");
    expect(modules.slice(45, 50)).toBe("01010");
    expect(modules.slice(-3)).toBe("101");
  });

  it("codifica o EAN-8 nos 67 módulos de referência", () => {
    expect(encodeEan("96385074")).toBe(EAN8_96385074);
  });

  it("codifica o UPC-A como o EAN-13 com zero à esquerda", () => {
    expect(encodeEan("036000291452")).toBe(UPCA_036000291452);
  });

  it.each([
    ["17891000315504", "GTIN-14 (outro símbolo, ITF-14)"],
    ["7891000315508", "dígito verificador errado"],
    ["78910003155a7", "letra"],
    ["", "vazio"],
  ])("não desenha %s (%s)", (code) => {
    expect(encodeEan(code)).toBeNull();
  });
});
