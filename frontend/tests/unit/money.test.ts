import { describe, expect, it } from "vitest";
import { formatPrice, splitPrice } from "@/lib/money";

describe("formatPrice (FR-001)", () => {
  it.each([
    ["49.90", "R$ 49,90"],
    ["0.05", "R$ 0,05"],
    ["1234.50", "R$ 1.234,50"],
    ["999999.99", "R$ 999.999,99"],
  ])("formata %s como %s", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });
});

describe("splitPrice (etiqueta de preço)", () => {
  it.each([
    ["49.90", { integer: "49", cents: "90" }],
    ["1234.50", { integer: "1.234", cents: "50" }],
    ["999999.99", { integer: "999.999", cents: "99" }],
  ])("separa %s em inteiro e centavos", (price, expected) => {
    expect(splitPrice(price)).toEqual(expected);
  });
});
