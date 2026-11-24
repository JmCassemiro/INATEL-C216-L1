/**
 * Validação dos formulários de estoque (spec 011, FR-021), com os limites do domínio:
 * quantidade de 1 a 99.999 e textos de até 200 caracteres. O servidor continua sendo a
 * autoridade (o saldo pode ter mudado em outra aba).
 */
import { parseQuantity } from "@/lib/quantity";
import type { EntryInput } from "./types";

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
