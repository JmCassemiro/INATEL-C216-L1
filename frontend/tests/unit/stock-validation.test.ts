import { describe, expect, it } from "vitest";
import {
  validateAdjustmentForm,
  validateEntryForm,
} from "@/features/stock/validation";

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

describe("validateAdjustmentForm (spec 011, FR-005, FR-006, FR-021)", () => {
  const VALID = {
    direction: "remove" as const,
    quantity: "2",
    reason: "  Avaria no transporte ",
  };

  it("'Retirar' vira quantidade negativa, com o motivo aparado", () => {
    expect(validateAdjustmentForm(VALID, 36)).toEqual({
      ok: true,
      input: { quantity: -2, reason: "Avaria no transporte" },
    });
  });

  it("'Adicionar' vira quantidade positiva", () => {
    expect(
      validateAdjustmentForm({ ...VALID, direction: "add", quantity: "1" }, 36),
    ).toEqual({
      ok: true,
      input: { quantity: 1, reason: "Avaria no transporte" },
    });
  });

  it.each([
    ["", "Informe o motivo do ajuste."],
    ["   ", "Informe o motivo do ajuste."],
    ["ok", "Use pelo menos 3 caracteres."],
    ["x".repeat(201), "Use no máximo 200 caracteres."],
  ])("recusa o motivo %j", (reason, error) => {
    expect(validateAdjustmentForm({ ...VALID, reason }, 36)).toEqual({
      ok: false,
      errors: { reason: error },
    });
  });

  it.each([
    [5, 3, "Saldo insuficiente: há 3 unidades em estoque"],
    [2, 1, "Saldo insuficiente: há 1 unidade em estoque"],
  ])("retirar %i com saldo %i é recusado", (quantity, balance, error) => {
    expect(
      validateAdjustmentForm({ ...VALID, quantity: String(quantity) }, balance),
    ).toEqual({ ok: false, errors: { quantity: error } });
  });

  it("adicionar além do teto é recusado", () => {
    expect(
      validateAdjustmentForm(
        { ...VALID, direction: "add", quantity: "10" },
        999_990,
      ),
    ).toEqual({
      ok: false,
      errors: { quantity: "O saldo não pode passar de 999.999 unidades" },
    });
  });

  it("junta os erros de quantidade e de motivo", () => {
    expect(
      validateAdjustmentForm({ ...VALID, quantity: "0", reason: "" }, 36),
    ).toEqual({
      ok: false,
      errors: {
        quantity: "A quantidade deve ser maior que zero.",
        reason: "Informe o motivo do ajuste.",
      },
    });
  });
});
