/**
 * Detalhe de uma venda (spec 004, FR-022), num painel lateral com cabeçalho noite, como
 * o histórico de estoque. Venda registrada é imutável (FR-018): não há ação de editar,
 * cancelar nem apagar.
 */
import { ReceiptTextIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/date";
import { useReturnFocus } from "@/lib/use-return-focus";
import { SaleBreakdown } from "./sale-breakdown";
import type { Sale } from "./types";

type SaleDetailSheetProps = {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SaleDetailSheet({
  sale,
  open,
  onOpenChange,
}: SaleDetailSheetProps) {
  const focus = useReturnFocus();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...focus}
        className="gap-0 border-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg [&>[data-slot=sheet-close]]:top-5 [&>[data-slot=sheet-close]]:right-5 [&>[data-slot=sheet-close]]:text-night-muted [&>[data-slot=sheet-close]]:hover:bg-white/10 [&>[data-slot=sheet-close]]:hover:text-night-foreground"
      >
        <SheetHeader className="relative isolate flex-row items-center gap-3 overflow-hidden bg-night-glow px-6 py-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-price-tag ring-1 ring-white/15">
            <ReceiptTextIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle className="text-xl font-extrabold tracking-tight text-night-foreground">
              Venda nº {sale?.number}
            </SheetTitle>
            <SheetDescription className="text-night-muted tabular-nums">
              {sale ? formatDateTime(sale.occurred_at) : ""}
            </SheetDescription>
          </div>
        </SheetHeader>
        <div className="overflow-y-auto px-6 py-6">
          {sale && <SaleBreakdown sale={sale} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
