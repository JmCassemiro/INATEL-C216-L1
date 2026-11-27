/**
 * Comprovante da venda registrada (spec 004, FR-020): número, momento, itens,
 * pagamentos, total e troco. "Nova venda" fecha e devolve o foco à leitura.
 */
import { CircleCheckIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/date";
import { formatPrice } from "@/lib/money";
import { SaleBreakdown } from "./sale-breakdown";
import type { Sale } from "./types";

type SaleReceiptDialogProps = {
  sale: Sale | null;
  onClose: () => void;
};

export function SaleReceiptDialog({ sale, onClose }: SaleReceiptDialogProps) {
  return (
    <Dialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        // O foco volta para a leitura do próximo produto, não para o botão.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {sale && (
          <>
            <DialogHeader className="items-center text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-success/10 text-success">
                <CircleCheckIcon className="size-6" aria-hidden="true" />
              </span>
              <DialogTitle className="text-xl font-extrabold">
                Venda nº {sale.number} registrada
              </DialogTitle>
              <DialogDescription>
                {formatDateTime(sale.occurred_at)} · total{" "}
                {formatPrice(sale.total)}
              </DialogDescription>
            </DialogHeader>
            <SaleBreakdown sale={sale} />
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" className="rounded-full px-5" asChild>
                <Link to="/sales">Ver vendas</Link>
              </Button>
              <Button
                variant="highlight"
                className="h-10 px-6"
                autoFocus
                onClick={onClose}
              >
                Nova venda
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
