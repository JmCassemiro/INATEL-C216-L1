/**
 * Venda em andamento (spec 004, research D13): um redutor puro e as contas derivadas,
 * em centavos inteiros (D14). O carrinho guarda o produto como foi lido; a API é quem
 * decide na finalização, e a recusa dela volta para cá por `applyProblems` (D16).
 */
import type { Product } from "@/features/products/types";
import { formatCents, toCents } from "@/lib/money";
import { formatQuantity } from "@/lib/quantity";
import type { Payment, SaleInput, SaleProblem } from "./types";

export const MAX_LINES = 100;
export const MAX_LINE_QUANTITY = 999;
export const MAX_PAYMENTS = 5;

export type CartLine = {
  /** O produto como foi lido (preço e saldo conhecidos pelo caixa). */
  product: Product;
  quantity: number;
  /** O que a API apontou na última tentativa de finalizar. */
  problem: SaleProblem | null;
};

export type Cart = { saleId: string; lines: CartLine[]; payments: Payment[] };

export type CartAction =
  | { type: "add"; product: Product }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "addPayment"; payment: Payment }
  | { type: "removePayment"; index: number }
  | { type: "applyProblems"; problems: SaleProblem[] }
  | { type: "reset"; saleId: string };

export const NON_CASH_OVER_TOTAL =
  "Só o pagamento em dinheiro pode passar do total e gerar troco";
export const CHANGE_NOT_BELOW_CASH =
  "O troco não pode ser igual ou maior que o valor pago em dinheiro";

export function emptyCart(saleId: string): Cart {
  return { saleId, lines: [], payments: [] };
}

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "add": {
      if (addCheck(cart, action.product) !== null) return cart;
      const exists = cart.lines.some(
        (line) => line.product.id === action.product.id,
      );
      const lines = exists
        ? cart.lines.map((line) =>
            line.product.id === action.product.id
              ? { ...line, quantity: line.quantity + 1, problem: null }
              : line,
          )
        : [
            ...cart.lines,
            { product: action.product, quantity: 1, problem: null },
          ];
      return { ...cart, lines };
    }
    case "setQuantity":
      return {
        ...cart,
        lines: cart.lines.map((line) =>
          line.product.id === action.productId
            ? { ...line, quantity: action.quantity, problem: null }
            : line,
        ),
      };
    case "remove":
      return {
        ...cart,
        lines: cart.lines.filter(
          (line) => line.product.id !== action.productId,
        ),
      };
    case "addPayment":
      return { ...cart, payments: [...cart.payments, action.payment] };
    case "removePayment":
      return {
        ...cart,
        payments: cart.payments.filter((_, index) => index !== action.index),
      };
    case "applyProblems":
      return {
        ...cart,
        lines: cart.lines.map((line) => withProblem(line, action.problems)),
      };
    case "reset":
      return emptyCart(action.saleId);
  }
}

function withProblem(line: CartLine, problems: SaleProblem[]): CartLine {
  const problem =
    problems.find((item) => item.product_id === line.product.id) ?? null;
  if (problem?.reason === "price_changed" && problem.current_price) {
    return {
      ...line,
      problem,
      product: { ...line.product, price: problem.current_price },
    };
  }
  if (problem?.reason === "insufficient_stock" && problem.available != null) {
    return {
      ...line,
      problem,
      product: { ...line.product, stock_quantity: problem.available },
    };
  }
  return { ...line, problem };
}

function scarce(product: Product): string {
  return product.stock_quantity === 0
    ? `${product.name} está sem estoque`
    : `Há só ${formatQuantity(product.stock_quantity)} un. de ${product.name} em estoque`;
}

/** Por que o produto não pode entrar (mais uma unidade) no carrinho; `null` se pode. */
export function addCheck(cart: Cart, product: Product): string | null {
  const line = cart.lines.find((item) => item.product.id === product.id);
  if (!line && cart.lines.length >= MAX_LINES) {
    return `A venda pode ter no máximo ${MAX_LINES} itens.`;
  }
  const next = (line?.quantity ?? 0) + 1;
  if (next > product.stock_quantity) return scarce(product);
  if (next > MAX_LINE_QUANTITY) return `Use no máximo ${MAX_LINE_QUANTITY}.`;
  return null;
}

/** Por que a quantidade não serve para a linha; `null` se serve (FR-005, FR-007). */
export function quantityCheck(
  line: CartLine | undefined,
  quantity: number,
): string | null {
  if (!line) return null;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return "A quantidade deve ser maior que zero.";
  }
  if (quantity > MAX_LINE_QUANTITY)
    return `Use no máximo ${MAX_LINE_QUANTITY}.`;
  if (quantity > line.product.stock_quantity) return scarce(line.product);
  return null;
}

export function totalCents(cart: Cart): number {
  return cart.lines.reduce(
    (sum, line) => sum + toCents(line.product.price) * line.quantity,
    0,
  );
}

export function paidCents(cart: Cart): number {
  return sumOf(cart.payments);
}

function cashCents(payments: Payment[]): number {
  return sumOf(payments.filter((payment) => payment.method === "cash"));
}

function sumOf(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
}

export function remainingCents(cart: Cart): number {
  return Math.max(totalCents(cart) - paidCents(cart), 0);
}

export function changeCents(cart: Cart): number {
  return Math.max(paidCents(cart) - totalCents(cart), 0);
}

export function itemCount(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Por que o pagamento não pode entrar; `null` se pode (FR-009 a FR-011). */
export function paymentError(cart: Cart, payment: Payment): string | null {
  if (cart.payments.length >= MAX_PAYMENTS) {
    return `Use no máximo ${MAX_PAYMENTS} pagamentos.`;
  }
  const remaining = remainingCents(cart);
  if (remaining === 0) return "O total já está pago.";
  if (payment.method !== "cash" && toCents(payment.amount) > remaining) {
    return NON_CASH_OVER_TOTAL;
  }
  return null;
}

/** Regra de troco quebrada pelos pagamentos já feitos (ex.: o total diminuiu). */
export function paymentsProblem(cart: Cart): string | null {
  const total = totalCents(cart);
  const paid = paidCents(cart);
  const cash = cashCents(cart.payments);
  if (paid - cash > total) return NON_CASH_OVER_TOTAL;
  if (paid > total && paid - total >= cash) return CHANGE_NOT_BELOW_CASH;
  return null;
}

/** A venda pode ser finalizada: itens válidos e o total pago dentro das regras. */
export function canFinish(cart: Cart): boolean {
  return (
    cart.lines.length > 0 &&
    cart.lines.every(
      (line) =>
        line.problem?.reason !== "unavailable" &&
        line.quantity <= line.product.stock_quantity,
    ) &&
    remainingCents(cart) === 0 &&
    paymentsProblem(cart) === null
  );
}

/** Situação do pagamento, como o caixa lê (contracts/ui.md). */
export function paymentStatus(cart: Cart): string {
  const remaining = remainingCents(cart);
  if (remaining > 0) return `Falta pagar ${formatCents(remaining)}`;
  const change = changeCents(cart);
  if (change > 0) return `Troco: ${formatCents(change)}`;
  return "Pagamento completo";
}

/** Corpo de `POST /sales` (contracts/sales-api.md §1). */
export function toSaleInput(cart: Cart): SaleInput {
  return {
    id: cart.saleId,
    items: cart.lines.map((line) => ({
      product_id: line.product.id,
      quantity: line.quantity,
      unit_price: line.product.price,
    })),
    payments: cart.payments,
  };
}
