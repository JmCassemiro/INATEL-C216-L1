import { describe, expect, it } from "vitest";
import { formatQuantity, formatUnits, parseQuantity } from "@/lib/quantity";

const ENTRY = { min: 1, max: 99_999 };

describe("parseQuantity (spec 011, research D15)", () => {
  it.each([
    ["24", 24],
    [" 24 ", 24],
    ["1", 1],
    ["1.000", 1000],
    ["99.999", 99_999],
    ["99999", 99_999],
    ["007", 7],
  ])("aceita %j como %i", (text, expected) => {
    expect(parseQuantity(text, ENTRY)).toEqual({ ok: true, value: expected });
  });

  it("recusa o vazio quando a quantidade é obrigatória", () => {
    expect(parseQuantity("  ", ENTRY)).toEqual({
      ok: false,
      error: "Informe a quantidade.",
    });
  });

  it("usa o valor padrão quando o campo vazio é permitido", () => {
    expect(parseQuantity("", { min: 0, max: 99_999, emptyAs: 0 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it.each(["1,5", "1.5", "1.00", "-1", "+2", "abc", "1e3", "1 000"])(
    "recusa %j por não ser um inteiro",
    (text) => {
      expect(parseQuantity(text, ENTRY)).toEqual({
        ok: false,
        error: "Use só números inteiros, como 24 ou 1.000.",
      });
    },
  );

  it("recusa zero quando o mínimo é 1", () => {
    expect(parseQuantity("0", ENTRY)).toEqual({
      ok: false,
      error: "A quantidade deve ser maior que zero.",
    });
  });

  it("aceita zero quando o mínimo é 0", () => {
    expect(parseQuantity("0", { min: 0, max: 99_999 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it.each(["100000", "100.000"])("recusa %j acima do máximo", (text) => {
    expect(parseQuantity(text, ENTRY)).toEqual({
      ok: false,
      error: "Use no máximo 99.999.",
    });
  });
});

describe("formatQuantity e formatUnits", () => {
  it.each([
    [0, "0"],
    [36, "36"],
    [1500, "1.500"],
    [999_999, "999.999"],
  ])("formata %i como %s", (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });

  it("acrescenta a unidade abreviada", () => {
    expect(formatUnits(1500)).toBe("1.500 un.");
  });
});
