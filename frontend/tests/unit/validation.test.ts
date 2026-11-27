import { describe, expect, it } from "vitest";
import {
  type ProductFormValues,
  validateProductForm,
} from "@/features/products/validation";

const VALID: ProductFormValues = {
  name: "Camiseta Básica Branca M",
  description: "",
  barcode: "7891000315507",
  price: "49,90",
  min_stock: "",
};

describe("validateProductForm (FR-009, data-model §2)", () => {
  it("dados válidos viram o corpo da API, com nome aparado e descrição vazia como null", () => {
    expect(
      validateProductForm({
        ...VALID,
        name: "  Camiseta Básica Branca M ",
        description: "   ",
      }),
    ).toEqual({
      ok: true,
      input: {
        name: "Camiseta Básica Branca M",
        description: null,
        barcode: "7891000315507",
        price: "49.90",
        min_stock: 0,
      },
    });
  });

  it("mantém a descrição aparada quando preenchida", () => {
    const result = validateProductForm({ ...VALID, description: " Algodão " });

    expect(result.ok && result.input.description).toBe("Algodão");
  });

  it.each(["", "   "])("nome vazio (%j) pede o nome", (name) => {
    expect(validateProductForm({ ...VALID, name })).toEqual({
      ok: false,
      errors: { name: "Informe o nome do produto." },
    });
  });

  it("nome com mais de 120 caracteres é recusado", () => {
    expect(validateProductForm({ ...VALID, name: "a".repeat(121) })).toEqual({
      ok: false,
      errors: { name: "Use no máximo 120 caracteres." },
    });
  });

  it("nome com 120 caracteres e espaços nas pontas é aceito", () => {
    expect(
      validateProductForm({ ...VALID, name: ` ${"a".repeat(120)} ` }).ok,
    ).toBe(true);
  });

  it("descrição com mais de 500 caracteres é recusada", () => {
    expect(
      validateProductForm({ ...VALID, description: "a".repeat(501) }),
    ).toEqual({
      ok: false,
      errors: { description: "Use no máximo 500 caracteres." },
    });
  });

  it("junta os erros de todos os campos", () => {
    expect(
      validateProductForm({
        name: "",
        description: "",
        barcode: "7891000315508",
        price: "0",
        min_stock: "",
      }),
    ).toEqual({
      ok: false,
      errors: {
        name: "Informe o nome do produto.",
        barcode: "Confira os dígitos: o código de barras não é válido.",
        price: "Informe um preço maior que zero.",
      },
    });
  });
});

describe("validateProductForm: estoque mínimo (spec 011, FR-012)", () => {
  it.each([
    ["", 0],
    ["10", 10],
    [" 7 ", 7],
    ["1.000", 1000],
  ])("aceita %j como %i", (text, expected) => {
    const result = validateProductForm({ ...VALID, min_stock: text });

    expect(result.ok && result.input.min_stock).toBe(expected);
  });

  it.each([
    ["-1", "Use só números inteiros, como 24 ou 1.000."],
    ["1,5", "Use só números inteiros, como 24 ou 1.000."],
    ["100000", "Use no máximo 99.999."],
  ])("recusa %j no campo min_stock", (text, error) => {
    expect(validateProductForm({ ...VALID, min_stock: text })).toEqual({
      ok: false,
      errors: { min_stock: error },
    });
  });
});
