import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/lib/date";

describe("formatDateTime (spec 011, research D17)", () => {
  it("mostra data e hora no formato brasileiro, no fuso pedido", () => {
    expect(formatDateTime("2026-11-24T17:35:00Z", "America/Sao_Paulo")).toBe(
      "24/11/2026 14:35",
    );
  });

  it("converte o horário UTC para o fuso (a data pode mudar)", () => {
    expect(formatDateTime("2026-11-25T01:05:00Z", "America/Sao_Paulo")).toBe(
      "24/11/2026 22:05",
    );
  });
});
