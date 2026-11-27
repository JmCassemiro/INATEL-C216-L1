import { cn } from "@/lib/utils";

/**
 * Os seis gradientes dos blocos (DESIGN.md, Cores). São a única lista de cores
 * soltas do painel: decoram a linha, não carregam significado.
 */
const GRADIENTS = [
  "from-sky-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-blue-500 to-indigo-700",
  "from-emerald-400 to-teal-600",
  "from-slate-500 to-slate-800",
  "from-pink-400 to-rose-500",
];

/** Palavras curtas ("de", "da", "com") não entram nas iniciais. */
const CONNECTORS = new Set(["de", "da", "do", "das", "dos", "com", "e"]);

export function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter(
      (word) => /\p{L}/u.test(word) && !CONNECTORS.has(word.toLowerCase()),
    );
  return words
    .slice(0, 2)
    .map((word) => (word.match(/\p{L}/u)?.[0] ?? "").toUpperCase())
    .join("");
}

/** Mesmo produto, mesma cor: o gradiente sai do id, não da posição na lista. */
function gradientFor(id: string): string {
  const hash = [...id].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
  return GRADIENTS[hash % GRADIENTS.length] ?? "";
}

/** Bloco colorido com as iniciais do produto; decorativo (o nome está ao lado). */
export function ProductAvatar({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br text-sm font-bold tracking-wide text-white shadow-md",
        gradientFor(id),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
