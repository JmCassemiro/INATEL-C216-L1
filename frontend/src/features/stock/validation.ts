/**
 * Validação dos formulários de estoque (spec 011, FR-021), com os limites do domínio:
 * quantidade de 1 a 99.999 e textos de até 200 caracteres. O servidor continua sendo a
 * autoridade (o saldo pode ter mudado em outra aba).
 */
import { formatQuantity, parseQuantity } from "@/lib/quantity";
import type { AdjustmentInput, EntryInput } from "./types";

const MOVEMENT_QUANTITY = { min: 1, max: 99_999 };
const TEXT_MAX = 200;

export type EntryFormValues = { quantity: string; note: string };
export type EntryFormErrors = Partial<Record<keyof EntryFormValues, string>>;

export type EntryFormResult =
  | { ok: true; input: EntryInput }
  | { ok: false; errors: EntryFormErrors };

export function validateEntryForm(values: EntryFormValues): EntryFormResult {
  const errors: EntryFormErrors = {};

  const quantity = parseQuantity(values.quantity, MOVEMENT_QUANTITY);
  if (!quantity.ok) errors.quantity = quantity.error;

  const note = values.note.trim();
  if (note.length > TEXT_MAX)
    errors.note = `Use no máximo ${TEXT_MAX} caracteres.`;

  if (!quantity.ok || Object.keys(errors).length > 0)
    return { ok: false, errors };
  return { ok: true, input: { quantity: quantity.value, note: note || null } };
}

const REASON_MIN = 3;
const MAX_BALANCE = 999_999;

/** "1 unidade", "3 unidades", "1.500 unidades": igual à mensagem do servidor. */
function units(quantity: number): string {
  const number = formatQuantity(quantity);
  return quantity === 1 ? `${number} unidade` : `${number} unidades`;
}

export type AdjustmentDirection = "remove" | "add";

export type AdjustmentFormValues = {
  direction: AdjustmentDirection;
  quantity: string;
  reason: string;
};
export type AdjustmentFormErrors = Partial<
  Record<"quantity" | "reason", string>
>;

export type AdjustmentFormResult =
  | { ok: true; input: AdjustmentInput }
  | { ok: false; errors: AdjustmentFormErrors };

/** Quanto o ajuste soma ao saldo (negativo ao retirar), ou `null` se a quantidade é inválida. */
export function adjustmentDelta(
  values: Pick<AdjustmentFormValues, "direction" | "quantity">,
): number | null {
  const quantity = parseQuantity(values.quantity, MOVEMENT_QUANTITY);
  if (!quantity.ok) return null;
  return values.direction === "remove" ? -quantity.value : quantity.value;
}

/**
 * Ajuste com direção explícita, quantidade sempre positiva e motivo obrigatório
 * (FR-005). Recusa já no navegador o saldo negativo ou acima do teto, com a mesma
 * mensagem do servidor (FR-006, FR-004), a partir do saldo exibido.
 */
export function validateAdjustmentForm(
  values: AdjustmentFormValues,
  balance: number,
): AdjustmentFormResult {
  const errors: AdjustmentFormErrors = {};

  const quantity = parseQuantity(values.quantity, MOVEMENT_QUANTITY);
  if (!quantity.ok) {
    errors.quantity = quantity.error;
  } else {
    const result = balance + (adjustmentDelta(values) ?? 0);
    if (result < 0)
      errors.quantity = `Saldo insuficiente: há ${units(balance)} em estoque`;
    else if (result > MAX_BALANCE)
      errors.quantity = "O saldo não pode passar de 999.999 unidades";
  }

  const reason = values.reason.trim();
  if (reason === "") errors.reason = "Informe o motivo do ajuste.";
  else if (reason.length < REASON_MIN)
    errors.reason = `Use pelo menos ${REASON_MIN} caracteres.`;
  else if (reason.length > TEXT_MAX)
    errors.reason = `Use no máximo ${TEXT_MAX} caracteres.`;

  const delta = adjustmentDelta(values);
  if (delta === null || Object.keys(errors).length > 0)
    return { ok: false, errors };
  return { ok: true, input: { quantity: delta, reason } };
}
