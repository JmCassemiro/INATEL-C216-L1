import { describe, expect, it } from "vitest";
import { initials } from "@/features/products/product-avatar";

describe("initials (bloco colorido da linha)", () => {
  it.each([
    ["Camiseta Básica Branca M", "CB"],
    ["Óculos de Sol Aviador", "ÓS"],
    ["Cinto de Couro Preto", "CC"],
    ["Garrafa Térmica 1 L", "GT"],
    ["(Kit) meia", "KM"],
    ["Boné", "B"],
  ])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
