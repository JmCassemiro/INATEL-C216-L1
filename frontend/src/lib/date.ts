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
