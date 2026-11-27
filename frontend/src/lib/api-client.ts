/**
 * Acesso à API do NexoPDV. Toda falha vira um `ApiError` com uma categoria
 * (`kind`), e as telas decidem a mensagem pela categoria, não pelo número do
 * status: o mesmo desenho dos erros do back-end (research D7).
 */

/** Endereço da API visto pelo navegador; o Compose define `VITE_API_URL`. */
export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export type ApiErrorKind =
  | "network"
  | "validation"
  | "not-found"
  | "conflict"
  | "unexpected";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** Erros de validação (422) por campo, a partir de `detail[].loc[1]`. */
  readonly fieldErrors: Record<string, string>;
  /**
   * Corpo da resposta de erro, para quem precisa de mais que a mensagem (ex.: os
   * problemas de cada item na recusa de uma venda, spec 004, research D16).
   */
  readonly body: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    fieldErrors: Record<string, string> = {},
    body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

const NETWORK_MESSAGE = "Sem conexão com o servidor.";
const UNEXPECTED_MESSAGE = "Algo deu errado no servidor. Tente de novo.";

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", NETWORK_MESSAGE);
  }

  if (response.status === 204) return undefined as T;
  const data = await readJson(response);
  if (response.ok) return data as T;
  throw toApiError(response.status, data);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type ValidationDetail = { loc?: unknown; msg?: unknown };

function toApiError(status: number, data: unknown): ApiError {
  const detail = (data as { detail?: unknown } | null)?.detail;
  switch (status) {
    case 404:
      return new ApiError("not-found", messageOf(detail), {}, data);
    case 409:
      return new ApiError("conflict", messageOf(detail), {}, data);
    case 422:
      return new ApiError(
        "validation",
        UNEXPECTED_MESSAGE,
        fieldErrorsOf(detail),
        data,
      );
    default:
      return new ApiError("unexpected", UNEXPECTED_MESSAGE);
  }
}

function messageOf(detail: unknown): string {
  return typeof detail === "string" ? detail : UNEXPECTED_MESSAGE;
}

function fieldErrorsOf(detail: unknown): Record<string, string> {
  if (!Array.isArray(detail)) return {};
  const errors: Record<string, string> = {};
  for (const item of detail as ValidationDetail[]) {
    const field = Array.isArray(item.loc) ? item.loc[1] : undefined;
    if (typeof field === "string" && typeof item.msg === "string") {
      errors[field] ??= item.msg;
    }
  }
  return errors;
}
