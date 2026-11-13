// Resposta falsa do fetch: só o que o cliente HTTP usa (ok, status e json).
export function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
