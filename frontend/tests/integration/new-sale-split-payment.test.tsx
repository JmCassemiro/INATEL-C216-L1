import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalog, gtin13 } from "../msw/catalog";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const SNEAKERS = {
  name: "Tênis Casual",
  barcode: gtin13(6),
  price: "150.00",
  stock_quantity: 10,
};
const SOCKS = {
  name: "Meia Cano Curto",
  barcode: gtin13(2),
  price: "37.70",
  stock_quantity: 10,
};

async function saleOf(user: User, ...codes: string[]) {
  await screen.findByRole("heading", { name: "Nova venda", level: 1 });
  const code = screen.getByRole("textbox", { name: "Código de barras" });
  for (const barcode of codes) {
    await user.type(code, `${barcode}{Enter}`);
  }
  await screen.findByRole("table", { name: "Itens da venda" });
}

function amountInput() {
  return screen.getByRole("textbox", { name: "Valor" });
}

function situation() {
  return screen.getByRole("status", { name: "Situação do pagamento" });
}

async function pay(user: User, method: string, amount: string) {
  await user.click(screen.getByRole("radio", { name: method }));
  await user.clear(amountInput());
  await user.type(amountInput(), amount);
  await user.click(screen.getByRole("button", { name: "Adicionar pagamento" }));
}

describe("Nova venda: pagamento dividido (US2)", () => {
  it("US2-1, US2-2: Pix e crédito fecham o total, sem troco", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);

    await pay(user, "Pix", "50");

    expect(situation()).toHaveTextContent("Falta pagar R$ 100,00");
    await waitFor(() => expect(amountInput()).toHaveValue("100,00"));
    await user.click(screen.getByRole("radio", { name: "Cartão de crédito" }));
    await user.click(
      screen.getByRole("button", { name: "Adicionar pagamento" }),
    );
    expect(situation()).toHaveTextContent("Pagamento completo");

    await user.click(screen.getByRole("button", { name: "Finalizar venda" }));

    const receipt = within(
      await screen.findByRole("dialog", { name: "Venda nº 1 registrada" }),
    );
    const payments = within(receipt.getByRole("list", { name: "Pagamentos" }));
    expect(payments.getByText("Pix")).toBeVisible();
    expect(payments.getByText("Cartão de crédito")).toBeVisible();
  });

  it("US2-3: débito 100 + dinheiro 60 para 150 dá R$ 10,00 de troco", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);

    await pay(user, "Cartão de débito", "100");
    await pay(user, "Dinheiro", "60");

    expect(situation()).toHaveTextContent("Troco: R$ 10,00");
    expect(
      screen.getByRole("button", { name: "Finalizar venda" }),
    ).toBeEnabled();
  });

  it("US2-4: Pix ou cartão acima do que falta é recusado no campo", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);

    await pay(user, "Pix", "200");

    expect(amountInput()).toHaveAccessibleDescription(
      "Só o pagamento em dinheiro pode passar do total e gerar troco",
    );
    expect(screen.queryByRole("list", { name: "Pagamentos" })).toBeNull();
  });

  it("FR-011: com o total pago, outro pagamento é recusado", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);
    await pay(user, "Cartão de crédito", "150");

    await pay(user, "Dinheiro", "20");

    expect(amountInput()).toHaveAccessibleDescription("O total já está pago.");
  });

  it("US2-5: remover um pagamento recalcula o que falta", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);
    await pay(user, "Pix", "50");
    await pay(user, "Dinheiro", "120");
    expect(situation()).toHaveTextContent("Troco: R$ 20,00");

    await user.click(
      screen.getByRole("button", {
        name: "Remover pagamento Dinheiro de R$ 120,00",
      }),
    );

    expect(situation()).toHaveTextContent("Falta pagar R$ 100,00");
  });

  it("US2-6: mudar os itens recalcula a falta e aponta a regra quebrada", async () => {
    catalog.seed(SNEAKERS, SOCKS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode, SOCKS.barcode);
    await pay(user, "Cartão de crédito", "187,70");
    expect(situation()).toHaveTextContent("Pagamento completo");

    await user.click(
      screen.getByRole("button", { name: `Remover ${SOCKS.name}` }),
    );

    expect(situation()).toHaveTextContent(
      "Só o pagamento em dinheiro pode passar do total e gerar troco",
    );
    expect(
      screen.getByRole("button", { name: "Finalizar venda" }),
    ).toBeDisabled();
  });

  it("FR-009: no máximo 5 pagamentos", async () => {
    catalog.seed(SNEAKERS);
    const { user } = renderApp("/sales/new");
    await saleOf(user, SNEAKERS.barcode);
    for (let index = 0; index < 5; index++) {
      await pay(user, "Pix", "1");
    }

    await pay(user, "Pix", "1");

    expect(amountInput()).toHaveAccessibleDescription(
      "Use no máximo 5 pagamentos.",
    );
    expect(
      within(screen.getByRole("list", { name: "Pagamentos" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(5);
  });
});
