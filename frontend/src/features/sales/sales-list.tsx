/**
 * Vendas realizadas (spec 004, FR-021): tabela no desktop e lista no celular, da mais
 * recente para a mais antiga, com os estados de carregando, vazio e erro (FR-027).
 */
import { EyeIcon, ReceiptTextIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import { formatPrice } from "@/lib/money";
import { formatUnits } from "@/lib/quantity";
import { useIsMobile } from "@/lib/use-is-mobile";
import { paymentSummary } from "./payment-methods";
import type { Sale } from "./types";

type SalesListProps = {
  sales: Sale[];
  onOpen: (sale: Sale) => void;
};

function methodsOf(sale: Sale): string {
  return paymentSummary(sale.payments.map((payment) => payment.method));
}

export function SalesList({ sales, onOpen }: SalesListProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ul aria-label="Vendas realizadas" className="divide-y">
        {sales.map((sale) => (
          <li key={sale.id} className="flex items-center gap-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold">nº {sale.number}</p>
              <p className="type-meta text-muted-foreground">
                {formatDateTime(sale.occurred_at)} ·{" "}
                {formatUnits(sale.item_count)}
              </p>
              <p className="type-meta text-muted-foreground">
                {methodsOf(sale)}
              </p>
            </div>
            <span className="font-bold tabular-nums">
              {formatPrice(sale.total)}
            </span>
            <OpenButton sale={sale} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table aria-label="Vendas realizadas">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-6">Venda</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Itens</TableHead>
          <TableHead>Pagamento</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-14 pr-6">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sales.map((sale) => (
          <TableRow key={sale.id}>
            <TableCell className="py-3.5 pl-6">
              <span className="inline-flex items-center gap-2 font-bold">
                <span className="grid size-8 place-items-center rounded-lg bg-accent text-primary">
                  <ReceiptTextIcon className="size-4" aria-hidden="true" />
                </span>
                nº {sale.number}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {formatDateTime(sale.occurred_at)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatUnits(sale.item_count)}
            </TableCell>
            <TableCell>{methodsOf(sale)}</TableCell>
            <TableCell className="text-right font-bold tabular-nums">
              {formatPrice(sale.total)}
            </TableCell>
            <TableCell className="pr-6">
              <OpenButton sale={sale} onOpen={onOpen} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OpenButton({
  sale,
  onOpen,
}: {
  sale: Sale;
  onOpen: (sale: Sale) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Ver venda nº ${sale.number}`}
      className="text-muted-foreground hover:text-primary"
      onClick={() => onOpen(sale)}
    >
      <EyeIcon />
    </Button>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export function SalesListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando as vendas…"
      className="flex flex-col divide-y"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SalesEmpty() {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-brand-gradient text-white shadow-glow-brand [&_svg:not([class*='size-'])]:size-7"
        >
          <ReceiptTextIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold">
          Nenhuma venda registrada ainda.
        </EmptyTitle>
        <EmptyDescription>
          As vendas finalizadas na frente de caixa aparecem aqui, da mais
          recente para a mais antiga.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="highlight" className="h-10 px-5">
          <Link to="/sales/new">Registrar a primeira venda</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function SalesLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="bg-card">
      <TriangleAlertIcon />
      <AlertTitle>Não foi possível carregar as vendas.</AlertTitle>
      <AlertDescription>
        Verifique a conexão com o servidor e tente de novo.
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      </AlertAction>
    </Alert>
  );
}
