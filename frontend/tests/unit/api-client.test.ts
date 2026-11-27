import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { API_URL, ApiError, apiRequest } from "@/lib/api-client";
import { server } from "../msw/server";

const URL = `${API_URL}/test`;

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("a requisição deveria ter falhado");
}

describe("apiRequest (research D7)", () => {
  it("devolve o JSON de uma resposta 2xx", async () => {
    server.use(http.get(URL, () => HttpResponse.json({ ok: true })));

    await expect(apiRequest("/test")).resolves.toEqual({ ok: true });
  });

  it("devolve undefined para 204 sem corpo", async () => {
    server.use(http.delete(URL, () => new HttpResponse(null, { status: 204 })));

    await expect(
      apiRequest("/test", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("envia o corpo como JSON, com Content-Type", async () => {
    let received: { contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post(URL, async ({ request }) => {
        received = {
          contentType: request.headers.get("Content-Type"),
          body: await request.json(),
        };
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    await apiRequest("/test", { method: "POST", body: { name: "Caneta" } });

    expect(received).toEqual({
      contentType: "application/json",
      body: { name: "Caneta" },
    });
  });

  it("FR-015: falha de rede vira erro 'network'", async () => {
    server.use(http.get(URL, () => HttpResponse.error()));

    const error = await failureOf(apiRequest("/test"));

    expect(error.kind).toBe("network");
    expect(error.message).toBe("Sem conexão com o servidor.");
  });

  it("FR-016: 404 vira 'not-found' com a mensagem da API", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.json(
          { detail: "Produto não encontrado" },
          { status: 404 },
        ),
      ),
    );

    const error = await failureOf(apiRequest("/test"));

    expect(error.kind).toBe("not-found");
    expect(error.message).toBe("Produto não encontrado");
  });

  it("FR-011: 409 vira 'conflict' com a mensagem da API", async () => {
    server.use(
      http.post(URL, () =>
        HttpResponse.json(
          { detail: "Código de barras já cadastrado" },
          { status: 409 },
        ),
      ),
    );

    const error = await failureOf(
      apiRequest("/test", { method: "POST", body: {} }),
    );

    expect(error.kind).toBe("conflict");
    expect(error.message).toBe("Código de barras já cadastrado");
  });

  it("spec 004, D16: o erro guarda o corpo da resposta (os problemas da venda)", async () => {
    const body = {
      detail: "Não foi possível finalizar a venda. Revise os itens destacados.",
      problems: [{ product_id: "p1", reason: "unavailable", message: "x" }],
    };
    server.use(http.post(URL, () => HttpResponse.json(body, { status: 409 })));

    const error = await failureOf(
      apiRequest("/test", { method: "POST", body: {} }),
    );

    expect(error.kind).toBe("conflict");
    expect(error.body).toEqual(body);
  });

  it("FR-011: 422 vira 'validation' com os erros por campo de detail[].loc", async () => {
    server.use(
      http.post(URL, () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ["body", "barcode"],
                msg: "Código de barras inválido",
                type: "value_error",
              },
              { loc: ["body"], msg: "Corpo inválido", type: "value_error" },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    const error = await failureOf(
      apiRequest("/test", { method: "POST", body: {} }),
    );

    expect(error.kind).toBe("validation");
    expect(error.fieldErrors).toEqual({ barcode: "Código de barras inválido" });
  });

  it("FR-015: qualquer outro status vira 'unexpected', sem detalhe técnico", async () => {
    server.use(
      http.get(URL, () =>
        HttpResponse.text("Internal Server Error", { status: 500 }),
      ),
    );

    const error = await failureOf(apiRequest("/test"));

    expect(error.kind).toBe("unexpected");
    expect(error.message).toBe("Algo deu errado no servidor. Tente de novo.");
  });
});
