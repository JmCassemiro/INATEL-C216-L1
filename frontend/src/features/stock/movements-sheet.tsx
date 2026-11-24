/**
 * Histórico de movimentações de um produto (spec 011, US4), num painel lateral: da
 * mais recente para a mais antiga, em páginas de 10, com data, tipo, quantidade com
 * sinal, saldo resultante e observação ou motivo. Movimentações são imutáveis
 * (FR-008): não há ação de editar nem de apagar.
 */
import {
  HistoryIcon,
  PackagePlusIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { ListPagination } from "@/components/list-pagination";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/features/products/types";
import { formatDateTime } from "@/lib/date";
import { formatQuantity, formatUnits } from "@/lib/quantity";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useReturnFocus } from "@/lib/use-return-focus";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, useMovements } from "./queries";
import type { MovementKind, StockMovement } from "./types";

type MovementsSheetProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Atalho do estado vazio: registrar a primeira entrada. */
  onEnter: (product: Product) => void;
};

const KIND_LABELS: Record<MovementKind, string> = {
  entry: "Entrada",
  adjustment: "Ajuste",
  sale: "Venda",
};

/** "+24" numa entrada, "−2" (sinal de menos de verdade) numa retirada. */
function signed(quantity: number): string {
  return quantity > 0
    ? `+${formatQuantity(quantity)}`
    : `−${formatQuantity(-quantity)}`;
}

export function MovementsSheet({
  product,
  open,
  onOpenChange,
  onEnter,
}: MovementsSheetProps) {
  const focus = useReturnFocus();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...focus}
        className="gap-0 border-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl [&>[data-slot=sheet-close]]:top-5 [&>[data-slot=sheet-close]]:right-5 [&>[data-slot=sheet-close]]:text-night-muted [&>[data-slot=sheet-close]]:hover:bg-white/10 [&>[data-slot=sheet-close]]:hover:text-night-foreground"
      >
        <SheetHeader className="relative isolate flex-row items-center gap-3 overflow-hidden bg-night-glow px-6 py-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-price-tag ring-1 ring-white/15">
            <HistoryIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <SheetTitle className="truncate text-xl font-extrabold tracking-tight text-night-foreground">
              Histórico de {product?.name}
            </SheetTitle>
            <SheetDescription className="text-night-muted tabular-nums">
              Saldo atual: {formatUnits(product?.stock_quantity ?? 0)}
            </SheetDescription>
          </div>
        </SheetHeader>
        {/* Montado só com o painel aberto: cada abertura começa na página 1. */}
        {product && <MovementsContent product={product} onEnter={onEnter} />}
      </SheetContent>
    </Sheet>
  );
}

function MovementsContent({
  product,
  onEnter,
}: {
  product: Product;
  onEnter: (product: Product) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useMovements(product.id, page);
  const data = query.data;
  const isMobile = useIsMobile();

  let content: React.ReactNode;
  if (query.isError) {
    content = (
      <Alert variant="destructive" className="m-6 w-auto bg-card">
        <TriangleAlertIcon />
        <AlertTitle>Não foi possível carregar o histórico.</AlertTitle>
        <AlertDescription>
          Verifique a conexão com o servidor e tente de novo.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Tentar de novo
          </Button>
        </AlertAction>
      </Alert>
    );
  } else if (!data) {
    content = <MovementsSkeleton />;
  } else if (data.total === 0) {
    content = (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-2xl bg-brand-gradient text-white shadow-glow-brand [&_svg:not([class*='size-'])]:size-7"
          >
            <ScrollTextIcon />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-bold">
            Nenhuma movimentação ainda.
          </EmptyTitle>
          <EmptyDescription>
            O histórico começa com a primeira entrada de mercadoria.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="highlight"
            className="h-10 px-5"
            onClick={() => onEnter(product)}
          >
            <PackagePlusIcon data-icon="inline-start" />
            Registrar entrada
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else {
    content = (
      <>
        {isMobile ? (
          <MovementsStack movements={data.items} />
        ) : (
          <MovementsTable movements={data.items} />
        )}
        <ListPagination
          label="Paginação do histórico"
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {content}
    </div>
  );
}

function KindPill({ kind }: { kind: MovementKind }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
        kind === "entry"
          ? "bg-accent text-accent-foreground ring-primary/15"
          : "bg-muted text-muted-foreground ring-border",
      )}
    >
      {KIND_LABELS[kind]}
    </span>
  );
}

function SignedQuantity({ quantity }: { quantity: number }) {
  return (
    <span
      className={cn(
        "font-bold tabular-nums",
        quantity > 0 ? "text-success" : "text-destructive",
      )}
    >
      {signed(quantity)}
    </span>
  );
}

function MovementsTable({ movements }: { movements: StockMovement[] }) {
  return (
    <Table aria-label="Movimentações" className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="type-eyebrow h-11 w-36 pl-6 text-muted-foreground">
            Data
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-24 text-muted-foreground">
            Tipo
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-24 text-right text-muted-foreground">
            Quantidade
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-24 text-right text-muted-foreground">
            Saldo
          </TableHead>
          <TableHead className="type-eyebrow h-11 pr-6 pl-6 text-muted-foreground">
            Observação
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => (
          <TableRow key={movement.id}>
            <TableCell className="py-3 pl-6 tabular-nums text-muted-foreground">
              {formatDateTime(movement.occurred_at)}
            </TableCell>
            <TableCell>
              <KindPill kind={movement.kind} />
            </TableCell>
            <TableCell className="text-right">
              <SignedQuantity quantity={movement.quantity} />
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {formatUnits(movement.balance_after)}
            </TableCell>
            <TableCell className="pr-6 pl-6 whitespace-normal">
              <Note text={movement.note} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MovementsStack({ movements }: { movements: StockMovement[] }) {
  return (
    <ul aria-label="Movimentações" className="divide-y">
      {movements.map((movement) => (
        <li key={movement.id} className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <KindPill kind={movement.kind} />
              <SignedQuantity quantity={movement.quantity} />
            </span>
            <span className="font-semibold tabular-nums">
              {formatUnits(movement.balance_after)}
            </span>
          </div>
          <span className="type-meta tabular-nums text-muted-foreground">
            {formatDateTime(movement.occurred_at)}
          </span>
          <Note text={movement.note} />
        </li>
      ))}
    </ul>
  );
}

/** Observação ou motivo; longos são resumidos e continuam inteiros no `title`. */
function Note({ text }: { text: string | null }) {
  if (!text)
    return (
      <>
        <span aria-hidden="true" className="text-muted-foreground">
          —
        </span>
        <span className="sr-only">Sem observação</span>
      </>
    );
  return (
    <span className="line-clamp-2 break-words" title={text}>
      {text}
    </span>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d"];

function MovementsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando o histórico…"
      className="flex flex-col divide-y"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
