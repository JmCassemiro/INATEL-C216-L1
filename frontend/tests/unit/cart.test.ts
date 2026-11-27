import { describe, expect, it } from "vitest";
import type { Product } from "@/features/products/types";
import {
  addCheck,
  type Cart,
  canFinish,
  cartReducer,
  changeCents,
  emptyCart,
  itemCount,
  paidCents,
  paymentError,
  paymentsProblem,
  quantityCheck,
  remainingCents,
  toSaleInput,
  totalCents,
} from "@/features/sales/cart";
import type { Payment } from "@/features/sales/types";

function product(overrides: Partial<Product> & Pick<Product, "id">): Product {
  return {
    name: "Camiseta",
    description: null,
    barcode: "7891000315507",
    price: "49.90",
    stock_quantity: 10,
    min_stock: 0,
    shortfall: 0,
    stock_status: "ok",
    ...overrides,
  };
}

const SHIRT = product({ id: "shirt", name: "Camiseta", price: "49.90" });
const SOCKS = product({ id: "socks", name: "Meia", price: "37.70" });

function cartWith(...steps: Parameters<typeof cartReducer>[1][]): Cart {
  return steps.reduce(cartReducer, emptyCart("sale-1"));
}

function pay(method: Payment["method"], amount: string) {
  return { type: "addPayment", payment: { method, amount } } as const;
}

describe("carrinho: itens (spec 004, FR-001 a FR-007)", () => {
  it("começa vazio, com o id da venda", () => {
    const cart = emptyCart("sale-1");

    expect(cart).toEqual({ saleId: "sale-1", lines: [], payments: [] });
  });

  it("FR-002: adicionar cria a linha com 1 e repetir soma 1", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
      { type: "add", product: SHIRT },
    );

    expect(cart.lines.map((line) => [line.product.id, line.quantity])).toEqual([
      ["shirt", 2],
      ["socks", 1],
    ]);
    expect(itemCount(cart)).toBe(3);
  });

  it("FR-006: total em centavos (soma de preço × quantidade)", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
    );

    expect(totalCents(cart)).toBe(13750);
  });

  it("FR-007: não adiciona produto sem estoque nem além do saldo", () => {
    const empty = product({ id: "x", name: "Boné", stock_quantity: 0 });
    const two = product({ id: "y", name: "Meia", stock_quantity: 2 });
    const cart = cartWith(
      { type: "add", product: two },
      { type: "add", product: two },
    );

    expect(addCheck(cart, empty)).toBe("Boné está sem estoque");
    expect(addCheck(cart, two)).toBe("Há só 2 un. de Meia em estoque");
    expect(addCheck(cart, SHIRT)).toBeNull();
    expect(cartReducer(cart, { type: "add", product: two })).toBe(cart);
  });

  it("FR-008: no máximo 100 itens distintos", () => {
    const products = Array.from({ length: 100 }, (_, index) =>
      product({ id: `p${index}` }),
    );
    const full = products.reduce(
      (cart, item) => cartReducer(cart, { type: "add", product: item }),
      emptyCart("sale-1"),
    );

    expect(addCheck(full, product({ id: "p100" }))).toBe(
      "A venda pode ter no máximo 100 itens.",
    );
  });

  it("FR-005: muda a quantidade de 1 a 999 e até o saldo", () => {
    const cart = cartWith({ type: "add", product: SHIRT });

    expect(quantityCheck(cart.lines[0], 0)).toBe(
      "A quantidade deve ser maior que zero.",
    );
    expect(quantityCheck(cart.lines[0], 11)).toBe(
      "Há só 10 un. de Camiseta em estoque",
    );
    expect(
      quantityCheck(
        {
          product: product({ id: "z", stock_quantity: 5000 }),
          quantity: 1,
          problem: null,
        },
        1000,
      ),
    ).toBe("Use no máximo 999.");
    expect(quantityCheck(cart.lines[0], 4)).toBeNull();
    const changed = cartReducer(cart, {
      type: "setQuantity",
      productId: "shirt",
      quantity: 4,
    });
    expect(changed.lines[0]?.quantity).toBe(4);
  });

  it("FR-005: remove o item", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
      { type: "remove", productId: "shirt" },
    );

    expect(cart.lines.map((line) => line.product.id)).toEqual(["socks"]);
  });

  it("reset esvazia e troca o id da venda", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      pay("cash", "100.00"),
      { type: "reset", saleId: "sale-2" },
    );

    expect(cart).toEqual(emptyCart("sale-2"));
  });
});

describe("carrinho: pagamento e troco (FR-009 a FR-012)", () => {
  const withShirt = () => cartWith({ type: "add", product: SHIRT });

  it("FR-010: falta pagar, pago e troco em centavos", () => {
    const partial = cartReducer(withShirt(), pay("pix", "20.00"));
    const over = cartReducer(withShirt(), pay("cash", "100.00"));

    expect(remainingCents(partial)).toBe(2990);
    expect(paidCents(partial)).toBe(2000);
    expect(changeCents(partial)).toBe(0);
    expect(remainingCents(over)).toBe(0);
    expect(changeCents(over)).toBe(5010);
  });

  it("FR-011: só o dinheiro passa do que falta", () => {
    const cart = withShirt();

    expect(paymentError(cart, { method: "pix", amount: "60.00" })).toBe(
      "Só o pagamento em dinheiro pode passar do total e gerar troco",
    );
    expect(paymentError(cart, { method: "cash", amount: "60.00" })).toBeNull();
    expect(paymentError(cart, { method: "pix", amount: "49.90" })).toBeNull();
  });

  it("FR-011: com o total pago, não aceita outro pagamento", () => {
    const cart = cartReducer(withShirt(), pay("credit_card", "49.90"));

    expect(paymentError(cart, { method: "cash", amount: "10.00" })).toBe(
      "O total já está pago.",
    );
  });

  it("FR-009: no máximo 5 pagamentos", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      pay("pix", "1.00"),
      pay("pix", "1.00"),
      pay("pix", "1.00"),
      pay("pix", "1.00"),
      pay("pix", "1.00"),
    );

    expect(paymentError(cart, { method: "pix", amount: "1.00" })).toBe(
      "Use no máximo 5 pagamentos.",
    );
  });

  it("FR-010: remove um pagamento", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      pay("pix", "10.00"),
      pay("cash", "20.00"),
      { type: "removePayment", index: 0 },
    );

    expect(cart.payments).toEqual([{ method: "cash", amount: "20.00" }]);
  });

  it("FR-011: itens mudados podem deixar os pagamentos fora da regra", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
      pay("credit_card", "87.60"),
      { type: "remove", productId: "socks" },
    );

    expect(paymentsProblem(cart)).toBe(
      "Só o pagamento em dinheiro pode passar do total e gerar troco",
    );
    expect(canFinish(cart)).toBe(false);
  });

  it("canFinish: precisa de itens e do total pago", () => {
    expect(canFinish(emptyCart("s"))).toBe(false);
    expect(canFinish(withShirt())).toBe(false);
    expect(canFinish(cartReducer(withShirt(), pay("cash", "50.00")))).toBe(
      true,
    );
  });
});

describe("carrinho: recusa do servidor (FR-014, research D16)", () => {
  it("atualiza o preço, limita o saldo e marca o item fora do catálogo", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
      { type: "add", product: product({ id: "cap", name: "Boné" }) },
      {
        type: "applyProblems",
        problems: [
          {
            product_id: "shirt",
            reason: "insufficient_stock",
            message: "Há só 1 un. de Camiseta em estoque",
            available: 1,
          },
          {
            product_id: "socks",
            reason: "price_changed",
            message: "O preço de Meia mudou para R$ 39,90",
            current_price: "39.90",
          },
          {
            product_id: "cap",
            reason: "unavailable",
            message: "Boné não está mais à venda",
          },
        ],
      },
    );

    const [shirt, socks, cap] = cart.lines;
    expect(shirt?.product.stock_quantity).toBe(1);
    expect(shirt?.problem?.reason).toBe("insufficient_stock");
    expect(socks?.product.price).toBe("39.90");
    expect(socks?.problem?.reason).toBe("price_changed");
    expect(cap?.problem?.reason).toBe("unavailable");
    expect(canFinish(cartReducer(cart, pay("cash", "500.00")))).toBe(false);
  });

  it("o preço atualizado não impede finalizar; o saldo corrigido libera", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SHIRT },
      {
        type: "applyProblems",
        problems: [
          {
            product_id: "shirt",
            reason: "insufficient_stock",
            message: "Há só 1 un. de Camiseta em estoque",
            available: 1,
          },
        ],
      },
      { type: "setQuantity", productId: "shirt", quantity: 1 },
      pay("cash", "50.00"),
    );

    expect(cart.lines[0]?.problem).toBeNull();
    expect(canFinish(cart)).toBe(true);
  });
});

describe("toSaleInput (contracts/sales-api.md §1)", () => {
  it("monta o corpo com o id, o preço mostrado e os pagamentos", () => {
    const cart = cartWith(
      { type: "add", product: SHIRT },
      { type: "add", product: SOCKS },
      pay("pix", "50.00"),
      pay("cash", "40.00"),
    );

    expect(toSaleInput(cart)).toEqual({
      id: "sale-1",
      items: [
        { product_id: "shirt", quantity: 1, unit_price: "49.90" },
        { product_id: "socks", quantity: 1, unit_price: "37.70" },
      ],
      payments: [
        { method: "pix", amount: "50.00" },
        { method: "cash", amount: "40.00" },
      ],
    });
  });
});
