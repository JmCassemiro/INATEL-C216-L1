import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { catalog } from "../msw/catalog";
import { PRODUCTS_URL } from "../msw/handlers";
import { server } from "../msw/server";
import { renderApp } from "../render";

type User = ReturnType<typeof renderApp>["user"];

const CAMISETA = "Camiseta Básica Branca M";

function seedShirt(stock_quantity = 36) {
  const [shirt] = catalog.seed({
    name: CAMISETA,
    barcode: "7891000315507",
    stock_quantity,
    min_stock: 10,
  });
  return shirt;
}

async function openAdjustment(user: User) {
  await user.click(
    await screen.findByRole("button", {
      name: `Ajustar estoque de ${CAMISETA}`,
    }),
  );
  return within(await screen.findByRole("dialog", { name: "Ajustar estoque" }));
}

async function fill(
  user: User,
  dialog: ReturnType<typeof within>,
  values: { quantity?: string; reason?: string },
) {
  if (values.quantity !== undefined)
    await user.type(
      dialog.getByRole("textbox", { name: "Quantidade" }),
      values.quantity,
    );
  if (values.reason !== undefined)
    await user.type(
      dialog.getByRole("textbox", { name: "Motivo" }),
      values.reason,
    );
}

describe("Ajuste de estoque (US3)", () => {
  it("US3-3: abre com 'Retirar' marcado e mostra a prévia do saldo ao digitar", async () => {
    seedShirt();
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);
    const kind = dialog.getByRole("radiogroup", { name: "Tipo de ajuste" });

    expect(within(kind).getByRole("radio", { name: "Retirar" })).toBeChecked();
    expect(dialog.getByText("Saldo atual: 36 un.")).toBeVisible();
    expect(
      dialog.getByRole("textbox", { name: "Motivo" }),
    ).toHaveAccessibleDescription(
      "Ex.: avaria, vencimento, contagem de inventário.",
    );

    await fill(user, dialog, { quantity: "2" });
    expect(dialog.getByRole("status")).toHaveTextContent("Saldo: 36 → 34");

    await user.click(within(kind).getByRole("radio", { name: "Adicionar" }));
    expect(dialog.getByRole("status")).toHaveTextContent("Saldo: 36 → 38");
  });

  it("US3-1, FR-023: retira com motivo, avisa e mostra o saldo novo", async () => {
    const shirt = seedShirt();
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);

    await fill(user, dialog, { quantity: "2", reason: "Avaria no transporte" });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await screen.findByText(`Ajuste salvo: ${CAMISETA} agora tem 34 un.`),
    ).toBeInTheDocument();
    expect(catalog.requestsTo("POST")).toEqual([
      {
        method: "POST",
        path: `/products/${shirt?.id}/stock/adjustments`,
        body: { quantity: -2, reason: "Avaria no transporte" },
      },
    ]);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("34 un.")).toBeVisible();
  });

  it("US3-2: 'Adicionar' envia a quantidade positiva", async () => {
    seedShirt(34);
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);

    await user.click(dialog.getByRole("radio", { name: "Adicionar" }));
    await fill(user, dialog, {
      quantity: "1",
      reason: "Contagem de inventário",
    });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await screen.findByText(`Ajuste salvo: ${CAMISETA} agora tem 35 un.`),
    ).toBeInTheDocument();
    expect(catalog.requestsTo("POST")[0]?.body).toEqual({
      quantity: 1,
      reason: "Contagem de inventário",
    });
  });

  it("US3-4: motivo curto não é enviado e mostra o motivo da recusa", async () => {
    seedShirt();
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);

    await fill(user, dialog, { quantity: "2", reason: "ok" });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await dialog.findByText("Use pelo menos 3 caracteres."),
    ).toBeVisible();
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("US3-5: retirar mais que o saldo é recusado no campo, sem envio", async () => {
    seedShirt(3);
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);

    await fill(user, dialog, { quantity: "5", reason: "Perda" });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await dialog.findByText("Saldo insuficiente: há 3 unidades em estoque"),
    ).toBeVisible();
    expect(catalog.requestsTo("POST")).toHaveLength(0);
  });

  it("Edge case: se o saldo mudou em outra aba, a recusa do servidor aparece no campo", async () => {
    const shirt = seedShirt(5);
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);
    // Outra aba retira 4 depois que este diálogo abriu com saldo 5.
    catalog.adjust(shirt?.id ?? "", { quantity: -4, reason: "Venda balcão" });

    await fill(user, dialog, { quantity: "3", reason: "Perda" });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await dialog.findByText("Saldo insuficiente: há 1 unidade em estoque"),
    ).toBeVisible();
    expect(dialog.getByRole("textbox", { name: "Quantidade" })).toHaveValue(
      "3",
    );
  });

  it("FR-022: durante o envio, o botão avisa e não envia de novo", async () => {
    seedShirt();
    server.use(
      http.post(`${PRODUCTS_URL}/:id/stock/adjustments`, async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const { user } = renderApp("/stock");
    const dialog = await openAdjustment(user);

    await fill(user, dialog, { quantity: "2", reason: "Avaria" });
    await user.click(dialog.getByRole("button", { name: "Salvar ajuste" }));

    expect(
      await dialog.findByRole("button", { name: "Salvando…" }),
    ).toBeDisabled();
  });
});
