import { cn } from "@/lib/utils";
import { encodeEan } from "./ean";

type Bar = { x: number; width: number };

/** Junta módulos "1" vizinhos numa barra só: "0110100" → barras em x=1 (largura 2) e x=4. */
function barsOf(modules: string): Bar[] {
  const bars: Bar[] = [];
  let start = -1;
  for (let index = 0; index <= modules.length; index++) {
    const isBar = modules[index] === "1";
    if (isBar && start < 0) start = index;
    if (!isBar && start >= 0) {
      bars.push({ x: start, width: index - start });
      start = -1;
    }
  }
  return bars;
}

/**
 * Código de barras desenhado em SVG (FR-022). Só aparece para EAN-13, UPC-A e
 * EAN-8 válidos; leitores de tela ouvem "Código de barras" e os dígitos.
 */
export function Barcode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const modules = encodeEan(code);
  if (!modules) return null;
  return (
    <svg
      role="img"
      aria-label={`Código de barras ${code}`}
      viewBox={`0 0 ${modules.length} 40`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={cn("h-10 w-full", className)}
    >
      {barsOf(modules).map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={0}
          width={bar.width}
          height={40}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
