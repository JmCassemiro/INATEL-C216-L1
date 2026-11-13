import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { jsonResponse } from "../helpers";

const NOTEBOOK = { id: "1", name: "Notebook", description: "14 polegadas" };

// Simula a API: GET devolve `items`; POST devolve `postResponse`.
function stubApi({ items = [], postResponse } = {}) {
  const fetchMock = vi.fn(async (_url, options) =>
    options?.method === "POST" ? postResponse : jsonResponse(items),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App", () => {
  it("mostra o carregamento até a API responder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<App />);

    expect(screen.getByText("Carregando itens...")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando a API não tem itens", async () => {
    stubApi({ items: [] });
    render(<App />);

    expect(
      await screen.findByText("Nenhum item cadastrado."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Carregando itens...")).not.toBeInTheDocument();
  });

  it("lista os itens vindos da API", async () => {
    stubApi({ items: [NOTEBOOK] });
    render(<App />);

    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("14 polegadas")).toBeInTheDocument();
  });

  it("mostra erro quando não consegue conectar à API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar à API.",
    );
  });

  it("cadastra um item pela API e o exibe na lista", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi({
      items: [],
      postResponse: jsonResponse(NOTEBOOK, 201),
    });
    render(<App />);
    await screen.findByText("Nenhum item cadastrado.");

    await user.type(screen.getByLabelText("Nome"), "Notebook");
    await user.type(screen.getByLabelText("Descrição"), "14 polegadas");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(
      screen.queryByText("Nenhum item cadastrado."),
    ).not.toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/items\/$/);
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      name: "Notebook",
      description: "14 polegadas",
    });
  });

  it("mostra o erro 409 e mantém o nome digitado", async () => {
    const user = userEvent.setup();
    stubApi({
      items: [NOTEBOOK],
      postResponse: jsonResponse(
        { detail: "Já existe um item com esse nome" },
        409,
      ),
    });
    render(<App />);
    await screen.findByText("Notebook");

    await user.type(screen.getByLabelText("Nome"), "Notebook");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Já existe um item com esse nome",
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Notebook");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("não chama a API com nome inválido", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi({ items: [] });
    render(<App />);
    await screen.findByText("Nenhum item cadastrado.");

    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "O nome é obrigatório.",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
