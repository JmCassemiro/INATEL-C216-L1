import { describe, expect, it, vi } from "vitest";
import { API_URL, createItem, listItems } from "../../src/services/items";
import { jsonResponse } from "../helpers";

const ITEMS_URL = `${API_URL}/items/`;

function stubFetch(implementation) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("listItems", () => {
  it("faz GET em /items/ e devolve a lista", async () => {
    const items = [{ id: "1", name: "Notebook", description: null }];
    const fetchMock = stubFetch(async () => jsonResponse(items));

    await expect(listItems()).resolves.toEqual(items);
    expect(fetchMock).toHaveBeenCalledWith(ITEMS_URL, undefined);
  });

  it("lança erro de conexão quando a API está inacessível", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(listItems()).rejects.toThrow(
      "Não foi possível conectar à API.",
    );
  });

  it("usa a mensagem padrão quando a API responde erro sem detail", async () => {
    stubFetch(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("not json");
      },
    }));

    await expect(listItems()).rejects.toThrow("Erro ao carregar os itens.");
  });
});

describe("createItem", () => {
  it("faz POST com JSON e devolve o item criado", async () => {
    const created = { id: "1", name: "Notebook", description: "14 polegadas" };
    const fetchMock = stubFetch(async () => jsonResponse(created, 201));

    await expect(
      createItem({ name: "Notebook", description: "14 polegadas" }),
    ).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(ITEMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Notebook", description: "14 polegadas" }),
    });
  });

  it("envia descrição vazia como null", async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse({ id: "1", name: "Mouse", description: null }, 201),
    );

    await createItem({ name: "Mouse", description: "" });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      name: "Mouse",
      description: null,
    });
  });

  it("lança o detail da API quando ele é texto (ex.: 409)", async () => {
    stubFetch(async () =>
      jsonResponse({ detail: "Já existe um item com esse nome" }, 409),
    );

    await expect(
      createItem({ name: "Notebook", description: "" }),
    ).rejects.toThrow("Já existe um item com esse nome");
  });

  it("usa a mensagem padrão quando o detail não é texto (ex.: 422)", async () => {
    stubFetch(async () =>
      jsonResponse({ detail: [{ loc: ["body", "name"], msg: "x" }] }, 422),
    );

    await expect(
      createItem({ name: "Notebook", description: "" }),
    ).rejects.toThrow("Erro ao cadastrar o item.");
  });
});
