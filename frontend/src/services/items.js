// Cliente HTTP da API de itens: todas as chamadas ao backend ficam aqui.
// VITE_API_URL é exposta ao navegador: nunca coloque senhas em variáveis VITE_*.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Com a barra final: "/items" sem ela responde 307, que o navegador trata mal com CORS.
const ITEMS_URL = `${API_URL}/items/`;

export function listItems() {
  return request(ITEMS_URL, undefined, "Erro ao carregar os itens.");
}

export function createItem({ name, description }) {
  return request(
    ITEMS_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    },
    "Erro ao cadastrar o item.",
  );
}

async function request(url, options, fallbackMessage) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error("Não foi possível conectar à API.");
  }

  // O fetch não rejeita em 4xx/5xx: o erro vem no corpo, em `detail`.
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === "string" ? detail : fallbackMessage);
  }

  return response.json();
}
