import { describe, expect, it } from "vitest";
import { NAME_MAX_LENGTH, validateItem } from "../../src/validation";

describe("validateItem", () => {
  it("rejeita nome vazio ou só com espaços", () => {
    const { errors } = validateItem({ name: "   ", description: "" });
    expect(errors.name).toBe("O nome é obrigatório.");
  });

  it("rejeita nome acima do limite de caracteres", () => {
    const { errors } = validateItem({
      name: "a".repeat(NAME_MAX_LENGTH + 1),
      description: "",
    });
    expect(errors.name).toBe(
      `O nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres.`,
    );
  });

  it("aceita nome no limite e remove espaços das pontas", () => {
    const name = "a".repeat(NAME_MAX_LENGTH);
    const result = validateItem({ name: ` ${name} `, description: "  x  " });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ name, description: "x" });
  });
});
