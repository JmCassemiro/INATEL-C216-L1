import { describe, expect, it } from "vitest";
import {
  averagePrice,
  formatCents,
  formatPrice,
  fromCents,
  parseMoneyInput,
  parsePriceInput,
  priceForInput,
  priceRange,
  splitPrice,
  toCents,
} from "@/lib/money";

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

describe("parsePriceInput (FR-009, FR-010, data-model §2)", () => {
  it.each([
    ["49,90", "49.90"],
    ["49.90", "49.90"],
    ["49.9", "49.90"],
    ["1234,5", "1234.50"],
    [" 10 ", "10.00"],
    ["007,50", "7.50"],
    ["999999,99", "999999.99"],
  ])("aceita %j como %s", (text, value) => {
    expect(parsePriceInput(text)).toEqual({ ok: true, value });
  });

  it.each([
    ["", "Informe o preço de venda."],
    ["   ", "Informe o preço de venda."],
    ["abc", "Use só números, com vírgula para os centavos."],
    ["1,2,3", "Use só números, com vírgula para os centavos."],
    ["-5", "Use só números, com vírgula para os centavos."],
    ["0", "Informe um preço maior que zero."],
    ["0,00", "Informe um preço maior que zero."],
    ["49,999", "Use no máximo duas casas decimais."],
    ["1000000", "O preço máximo é R$ 999.999,99."],
  ])("recusa %j", (text, error) => {
    expect(parsePriceInput(text)).toEqual({ ok: false, error });
  });
});

describe("priceForInput (edição)", () => {
  it("mostra o preço da API com vírgula", () => {
    expect(priceForInput("49.90")).toBe("49,90");
  });
});

describe("averagePrice (indicadores)", () => {
  it("calcula a média em centavos inteiros, sem float", () => {
    expect(averagePrice(["49.90", "159.90", "12.50"])).toBe("74.10");
  });

  it("arredonda meio centavo para cima", () => {
    expect(averagePrice(["0.01", "0.02"])).toBe("0.02");
  });

  it("aceita preços de seis dígitos", () => {
    expect(averagePrice(["999999.99", "999999.99"])).toBe("999999.99");
  });

  it("devolve null sem preços", () => {
    expect(averagePrice([])).toBeNull();
  });
});

describe("priceRange (indicadores)", () => {
  it("devolve o menor e o maior preço, comparando em centavos", () => {
    expect(priceRange(["49.90", "1249.99", "12.50", "159.90"])).toEqual({
      min: "12.50",
      max: "1249.99",
    });
  });

  it("devolve null sem preços", () => {
    expect(priceRange([])).toBeNull();
  });
});

describe("parseMoneyInput (spec 004, research D14)", () => {
  it.each([
    ["100", "100.00"],
    ["87,5", "87.50"],
    ["87,50", "87.50"],
    ["49.90", "49.90"],
    ["1.5", "1.50"],
    ["1.234,56", "1234.56"],
    ["1.234", "1234.00"],
    ["  0,01 ", "0.01"],
    ["999.999,99", "999999.99"],
  ])("lê %s como %s", (text, expected) => {
    expect(parseMoneyInput(text)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ["", "Informe o valor."],
    ["   ", "Informe o valor."],
    ["abc", "Use só números, com vírgula para os centavos."],
    ["-5", "Use só números, com vírgula para os centavos."],
    ["1,2,3", "Use só números, com vírgula para os centavos."],
    ["0", "Informe um valor maior que zero."],
    ["0,00", "Informe um valor maior que zero."],
    ["1,234", "Use no máximo duas casas decimais."],
    ["1000000", "O valor máximo é R$ 999.999,99."],
  ])("recusa %j com a mensagem certa", (text, error) => {
    expect(parseMoneyInput(text)).toEqual({ ok: false, error });
  });
});

describe("centavos (spec 004, research D14)", () => {
  it.each([
    ["49.90", 4990],
    ["0.05", 5],
    ["999999.99", 99999999],
  ])("toCents(%s) = %i", (amount, cents) => {
    expect(toCents(amount)).toBe(cents);
  });

  it.each([
    [4990, "49.90"],
    [5, "0.05"],
    [0, "0.00"],
    [123456, "1234.56"],
  ])("fromCents(%i) = %s", (cents, amount) => {
    expect(fromCents(cents)).toBe(amount);
  });

  it("formatCents mostra em reais", () => {
    expect(formatCents(123456)).toBe("R$ 1.234,56");
    expect(formatCents(0)).toBe("R$ 0,00");
  });
});
