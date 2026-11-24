/**
 * Data e hora no formato brasileiro (spec 011, research D17): "24/11/2026 14:35". A API
 * devolve o momento em UTC; a tela mostra no fuso do navegador. O `timeZone` só é
 * passado pelos testes, para o resultado não depender da máquina.
 */
export function formatDateTime(iso: string, timeZone?: string): string {
  const moment = new Date(iso);
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(moment);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(moment);
  return `${date} ${time}`;
}

/**
 * O dia de hoje no fuso do navegador, da meia-noite à meia-noite seguinte, em ISO
 * (UTC). É o intervalo que o painel pede ao resumo de vendas (spec 004, FR-023): a
 * API não precisa saber o fuso da loja.
 */
export function todayRange(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
