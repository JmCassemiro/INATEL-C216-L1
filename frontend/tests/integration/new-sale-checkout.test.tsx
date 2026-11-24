import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { SaleInput } from "@/features/sales/types";
import { catalog, gtin13 } from "../msw/catalog";
import { SALES_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const PANTS = {
  name: "Calça Moletom",
  barcode: gtin13(5),
  price: "87.50",
  stock_quantity: 10,
};

async function saleWithPants(user: User) {
  await screen.findByRole("heading", { name: "Nova venda", level: 1 });
  await user.type(
    screen.getByRole("textbox", { name: "Código de barras" }),
    `${PANTS.barcode}{Enter}`,
  );
  await screen.findByRole("table", { name: "Itens da venda" });
}

function amountInput() {
  return screen.getByRole("textbox", { name: "Valor" });
}

function situation() {
  return screen.getByRole("status", { name: "Situação do pagamento" });
}

function finishButton() {
  return screen.getByRole("button", { name: /Finalizar venda|Finalizando/ });
}

async function pay(user: User, method: string, amount?: string) {
  await user.click(screen.getByRole("radio", { name: method }));
  if (amount !== undefined) {
    await user.clear(amountInput());
    await user.type(amountInput(), amount);
  }
  await user.click(screen.getByRole("button", { name: "Adicionar pagamento" }));
}

function salePosts() {
  return catalog
    .requestsTo("POST")
    .filter((request) => request.path === "/sales");
}

describe("Nova venda: pagamento e finalização (US1)", () => {
  it("FR-010: começa em Dinheiro, com o valor que falta", async () => {
    catalog.seed(PANTS);
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);

    expect(screen.getByRole("radio", { name: "Dinheiro" })).toBeChecked();
    await waitFor(() => expect(amountInput()).toHaveValue("87,50"));
    expect(situation()).toHaveTextContent("Falta pagar R$ 87,50");
    expect(finishButton()).toBeDisabled();
  });

  it("US1-7: R$ 100,00 em dinheiro para R$ 87,50 mostra o troco", async () => {
    catalog.seed(PANTS);
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);

    await pay(user, "Dinheiro", "100");

    const payments = screen.getByRole("list", { name: "Pagamentos" });
    expect(within(payments).getByText("Dinheiro")).toBeVisible();
    expect(within(payments).getByText("R$ 100,00")).toBeVisible();
    expect(situation()).toHaveTextContent("Troco: R$ 12,50");
    expect(finishButton()).toBeEnabled();
  });

  it("US1-8, US1-9: finaliza uma vez só e mostra o comprovante", async () => {
    const [pants] = catalog.seed(PANTS);
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);
    await pay(user, "Dinheiro", "100");

    await user.dblClick(finishButton());

    const receipt = within(
      await screen.findByRole("dialog", { name: "Venda nº 1 registrada" }),
    );
    expect(receipt.getByText(`1 × ${PANTS.name}`)).toBeVisible();
    expect(receipt.getByText("Dinheiro")).toBeVisible();
    expect(receipt.getByText("Troco")).toBeVisible();
    expect(receipt.getByText("R$ 12,50")).toBeVisible();
    expect(salePosts()).toHaveLength(1);
    expect(salePosts()[0]?.body).toMatchObject({
      items: [{ product_id: pants?.id, quantity: 1, unit_price: "87.50" }],
      payments: [{ method: "cash", amount: "100.00" }],
    });
  });

  it("Nova venda esvazia o carrinho e devolve o foco ao código", async () => {
    catalog.seed(PANTS);
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);
    await pay(user, "Pix");
    await user.click(finishButton());
    const receipt = await screen.findByRole("dialog", {
      name: "Venda nº 1 registrada",
    });

    await user.click(
      within(receipt).getByRole("button", { name: "Nova venda" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Venda nº 1 registrada" }),
      ).toBeNull(),
    );
    expect(
      screen.getByText(
        "Nenhum item ainda. Leia o código de barras do primeiro produto.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Código de barras" }),
    ).toHaveFocus();
  });

  it("FR-016, US1-11: sem conexão, mantém tudo e tenta de novo com o mesmo id", async () => {
    catalog.seed(PANTS);
    let firstId: string | undefined;
    server.use(
      http.post(
        SALES_URL,
        async ({ request }) => {
          firstId = ((await request.json()) as SaleInput).id;
          return HttpResponse.error();
        },
        { once: true },
      ),
    );
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);
    await pay(user, "Pix");

    await user.click(finishButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sem conexão com o servidor.",
    );
    expect(screen.getByRole("table", { name: "Itens da venda" })).toBeVisible();
    await user.click(finishButton());
    await screen.findByRole("dialog", { name: "Venda nº 1 registrada" });
    expect(salePosts()[0]?.body).toMatchObject({ id: firstId });
  });

  it("FR-014: recusa do servidor marca os itens e mantém o carrinho", async () => {
    const [pants, socks] = catalog.seed(PANTS, {
      name: "Meia Cano Curto",
      barcode: gtin13(2),
      price: "37.70",
      stock_quantity: 2,
    });
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);
    const code = screen.getByRole("textbox", { name: "Código de barras" });
    await user.type(code, `${gtin13(2)}{Enter}`);
    await user.type(code, `${gtin13(2)}{Enter}`);
    await waitFor(() => expect(situation()).toHaveTextContent("R$ 162,90"));
    await pay(user, "Pix");
    // Enquanto a venda era montada: o preço da calça mudou e saiu uma meia.
    catalog.update(pants?.id ?? "", {
      ...PANTS,
      description: null,
      min_stock: 0,
      price: "89.90",
    });
    catalog.adjust(socks?.id ?? "", { quantity: -1, reason: "Avaria" });

    await user.click(finishButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível finalizar a venda. Revise os itens destacados.",
    );
    const table = screen.getByRole("table", { name: "Itens da venda" });
    expect(within(table).getByText("Preço atualizado")).toBeVisible();
    expect(within(table).getAllByText("R$ 89,90").length).toBeGreaterThan(0);
    expect(within(table).getByText("Há só 1 un.")).toBeVisible();
    expect(finishButton()).toBeDisabled();
  });

  it("US1-12: descartar pede confirmação e esvazia", async () => {
    catalog.seed(PANTS);
    const { user } = renderApp("/sales/new");
    await saleWithPants(user);

    await user.click(screen.getByRole("button", { name: "Descartar venda" }));
    const confirm = await screen.findByRole("alertdialog", {
      name: "Descartar a venda?",
    });
    await user.click(
      within(confirm).getByRole("button", { name: "Descartar" }),
    );

    expect(
      await screen.findByText(
        "Nenhum item ainda. Leia o código de barras do primeiro produto.",
      ),
    ).toBeVisible();
    expect(salePosts()).toHaveLength(0);
  });
});
