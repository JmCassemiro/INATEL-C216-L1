import { describe, expect, it } from "vitest";
import { gtinError, gtinKind, isValidGtin } from "@/features/products/gtin";

const FORMAT = "Use só números: 8, 12, 13 ou 14 dígitos.";
const CHECK_DIGIT = "Confira os dígitos: o código de barras não é válido.";

describe("GTIN (FR-009, mesma regra do domínio da spec 002)", () => {
  it.each([
    ["7891000315507", "EAN-13"],
    ["96385074", "EAN-8"],
    ["036000291452", "UPC-A"],
    ["17891000315504", "GTIN-14"],
  ])("aceita %s (%s)", (code) => {
    expect(isValidGtin(code)).toBe(true);
    expect(gtinError(code)).toBeNull();
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidGtin("7891000315508")).toBe(false);
    expect(gtinError("7891000315508")).toBe(CHECK_DIGIT);
  });

  it.each(["123", "789100031550a", "789100031", "789100031550712"])(
    "recusa formato fora do GTIN: %s",
    (code) => {
      expect(isValidGtin(code)).toBe(false);
      expect(gtinError(code)).toBe(FORMAT);
    },
  );

  it("pede o código quando o campo está vazio", () => {
    expect(gtinError("")).toBe("Informe o código de barras.");
  });
});

describe("gtinKind (pílula do tipo de código)", () => {
  it.each([
    ["96385074", "EAN-8"],
    ["036000291452", "UPC-A"],
    ["7891000315507", "EAN-13"],
    ["17891000315504", "GTIN-14"],
  ])("%s é %s", (code, kind) => {
    expect(gtinKind(code)).toBe(kind);
  });
});
