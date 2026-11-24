import { describe, expect, it } from "vitest";
import { validateEntryForm } from "@/features/stock/validation";

describe("validateEntryForm (spec 011, FR-003, FR-021)", () => {
  it("vira o corpo da API, com a observação aparada", () => {
    expect(
      validateEntryForm({ quantity: "1.000", note: "  NF 1234 " }),
    ).toEqual({ ok: true, input: { quantity: 1000, note: "NF 1234" } });
  });

  it("observação vazia vira null", () => {
    expect(validateEntryForm({ quantity: "24", note: "   " })).toEqual({
      ok: true,
      input: { quantity: 24, note: null },
    });
  });

  it.each([
    ["", "Informe a quantidade."],
    ["0", "A quantidade deve ser maior que zero."],
    ["1,5", "Use só números inteiros, como 24 ou 1.000."],
    ["100000", "Use no máximo 99.999."],
  ])("recusa a quantidade %j", (quantity, error) => {
    expect(validateEntryForm({ quantity, note: "" })).toEqual({
      ok: false,
      errors: { quantity: error },
    });
  });

  it("recusa observação com mais de 200 caracteres", () => {
    expect(validateEntryForm({ quantity: "1", note: "x".repeat(201) })).toEqual(
      { ok: false, errors: { note: "Use no máximo 200 caracteres." } },
    );
  });
});
