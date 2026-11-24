/** Meios de pagamento aceitos, na ordem em que aparecem no caixa (spec 004, FR-009). */
import type { PaymentMethod } from "./types";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "cash",
  "pix",
  "credit_card",
  "debit_card",
];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

/** Meios usados numa venda, sem repetir: "Pix + Dinheiro". */
export function paymentSummary(methods: PaymentMethod[]): string {
  return [...new Set(methods)]
    .map((method) => PAYMENT_LABELS[method])
    .join(" + ");
}
