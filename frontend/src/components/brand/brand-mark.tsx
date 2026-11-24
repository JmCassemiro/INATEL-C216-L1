import { cn } from "@/lib/utils";

/** Larguras das cinco barras da marca (1-2-1-3-1), com uma unidade de espaço entre elas. */
const BARS = [
  { x: 0, width: 1 },
  { x: 2, width: 2 },
  { x: 5, width: 1 },
  { x: 7, width: 3 },
  { x: 11, width: 1 },
];

type BrandMarkProps = {
  /** `night`: sobre o menu lateral ou o hero (texto claro, "PDV" amarelo). */
  tone?: "default" | "night";
  className?: string;
};

/**
 * Marca do NexoPDV: as barras de código de barras num quadrado com o gradiente da
 * marca, mais o nome. O nome acessível é "NexoPDV" (as barras são decorativas).
 */
export function BrandMark({ tone = "default", className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient shadow-glow-brand">
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-5 text-white"
        >
          {BARS.map((bar) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={0}
              width={bar.width}
              height={12}
              fill="currentColor"
            />
          ))}
        </svg>
      </span>
      <span
        className={cn(
          "type-brand",
          tone === "night" ? "text-night-foreground" : "text-foreground",
        )}
      >
        Nexo
        <span className={tone === "night" ? "text-price-tag" : "text-primary"}>
          PDV
        </span>
      </span>
    </span>
  );
}
