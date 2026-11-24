import { describe, expect, it } from "vitest";
import { formatDateTime, todayRange } from "@/lib/date";

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

describe("todayRange (spec 004, FR-023)", () => {
  it("vai da meia-noite local de hoje à de amanhã", () => {
    const { start, end } = todayRange(new Date(2026, 10, 25, 14, 30));

    expect(new Date(start)).toEqual(new Date(2026, 10, 25));
    expect(new Date(end)).toEqual(new Date(2026, 10, 26));
  });

  it("devolve datas ISO com fuso, como a API pede", () => {
    const { start, end } = todayRange(new Date(2026, 10, 25, 23, 59));

    expect(start).toMatch(/Z$/);
    expect(end).toMatch(/Z$/);
  });
});
