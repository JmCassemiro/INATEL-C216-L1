/**
 * Pílula da situação do estoque (spec 011, research D16). O texto sempre diz a
 * situação, então a cor nunca é a única pista: vermelho para sem estoque, âmbar para
 * repor, verde para em dia. O amarelo da etiqueta fica reservado ao dinheiro.
 */
import type { StockStatus } from "@/features/products/types";
import { formatQuantity } from "@/lib/quantity";
import { cn } from "@/lib/utils";

const TONES: Record<StockStatus, string> = {
  out_of_stock: "bg-destructive/10 text-destructive ring-destructive/25",
  restock: "bg-warning/10 text-warning ring-warning/30",
  ok: "bg-success/10 text-success ring-success/25",
};

export function stockStatusLabel(
  status: StockStatus,
  shortfall?: number,
): string {
  switch (status) {
    case "out_of_stock":
      return "Sem estoque";
    case "restock":
      return shortfall === undefined
        ? "Repor"
        : `Repor · faltam ${formatQuantity(shortfall)}`;
    case "ok":
      return "Em dia";
  }
}

export function StockStatusPill({
  status,
  shortfall,
  className,
}: {
  status: StockStatus;
  /** Com a falta, "Repor" vira "Repor · faltam N" (seção Estoque). */
  shortfall?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1",
        TONES[status],
        className,
      )}
    >
      {stockStatusLabel(status, shortfall)}
    </span>
  );
}
