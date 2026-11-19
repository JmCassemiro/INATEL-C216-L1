import { cn } from "@/lib/utils";

/** Larguras das cinco barras da marca (1-2-1-3-1), com uma unidade de espaço entre elas. */
const BARS = [
  { x: 0, width: 1 },
  { x: 2, width: 2 },
  { x: 5, width: 1 },
  { x: 7, width: 3 },
  { x: 11, width: 1 },
];

/** Marca do NexoPDV: barras de código de barras em Tinta + o nome em Letreiro. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-5 text-primary"
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
      <span className="type-brand">NexoPDV</span>
    </span>
  );
}
