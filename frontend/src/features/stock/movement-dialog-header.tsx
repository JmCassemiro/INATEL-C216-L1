import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/features/products/types";
import { formatUnits } from "@/lib/quantity";

/**
 * Cabeçalho dos diálogos de movimentação (entrada e ajuste): ícone da ação, título e,
 * na descrição, o produto e o saldo atual que o lojista está alterando.
 */
export function MovementDialogHeader({
  icon: Icon,
  title,
  product,
}: {
  icon: LucideIcon;
  title: string;
  product: Product | null;
}) {
  return (
    <DialogHeader className="flex-row items-center gap-3 text-left">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-primary ring-1 ring-primary/15">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <DialogTitle className="text-xl font-extrabold tracking-tight">
          {title}
        </DialogTitle>
        {product && (
          <DialogDescription className="flex flex-col gap-0.5">
            <span className="truncate font-semibold text-foreground">
              {product.name}
            </span>
            <span className="tabular-nums">
              Saldo atual: {formatUnits(product.stock_quantity)}
            </span>
          </DialogDescription>
        )}
      </div>
    </DialogHeader>
  );
}
