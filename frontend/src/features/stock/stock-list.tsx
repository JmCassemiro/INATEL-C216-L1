/**
 * Posição de estoque e os estados dela (spec 011, FR-016, FR-019 e FR-024). No
 * desktop é uma tabela com as ações de cada produto; abaixo de 640 px vira uma lista
 * empilhada, com as ações num menu "Ações de {nome}".
 */
import {
  EllipsisVerticalIcon,
  HistoryIcon,
  PackageOpenIcon,
  PackagePlusIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Link } from "react-router";
import { IconAction } from "@/components/icon-action";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ProductAvatar } from "@/features/products/product-avatar";
import type { Product } from "@/features/products/types";
import { formatUnits } from "@/lib/quantity";
import { useIsMobile } from "@/lib/use-is-mobile";
import { StockStatusPill } from "./stock-status";

/** Ações de cada produto; as que não forem passadas não aparecem. */
export type StockActions = {
  onEnter: (product: Product) => void;
  onAdjust?: (product: Product) => void;
  onHistory?: (product: Product) => void;
};

type StockListProps = StockActions & {
  products: Product[];
  /** Produto que acabou de mudar: a linha recebe o destaque amarelo. */
  highlightedId?: string | null;
};

export function StockList(props: StockListProps) {
  const isMobile = useIsMobile();
  return isMobile ? <StockStack {...props} /> : <StockTable {...props} />;
}

function highlight(product: Product, highlightedId?: string | null) {
  return product.id === highlightedId ? "true" : undefined;
}

function Minimum({ value }: { value: number }) {
  if (value > 0) return <>{formatUnits(value)}</>;
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Sem mínimo</span>
    </>
  );
}

function StockTable({
  products,
  highlightedId,
  onEnter,
  onAdjust,
  onHistory,
}: StockListProps) {
  return (
    <Table aria-label="Estoque" className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="type-eyebrow h-11 pl-6 text-muted-foreground">
            Produto
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-32 text-right text-muted-foreground">
            Quantidade
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-28 text-right text-muted-foreground">
            Mínimo
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-44 pl-6 text-muted-foreground">
            Situação
          </TableHead>
          <TableHead className="w-40 pr-6">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow
            key={product.id}
            data-highlighted={highlight(product, highlightedId)}
            className="group/row transition-colors hover:bg-accent/50"
          >
            <TableHead
              scope="row"
              className="h-auto py-3.5 pl-6 font-normal text-foreground"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ProductAvatar id={product.id} name={product.name} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold" title={product.name}>
                    {product.name}
                  </span>
                  <span className="type-meta tabular-nums tracking-[0.04em] text-muted-foreground">
                    {product.barcode}
                  </span>
                </div>
              </div>
            </TableHead>
            <TableCell className="text-right text-base font-bold tabular-nums">
              {formatUnits(product.stock_quantity)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              <Minimum value={product.min_stock} />
            </TableCell>
            <TableCell className="pl-6">
              <StockStatusPill
                status={product.stock_status}
                shortfall={product.shortfall}
              />
            </TableCell>
            <TableCell className="pr-6">
              <div className="flex justify-end gap-1">
                <IconAction
                  label={`Registrar entrada de ${product.name}`}
                  tooltip="Registrar entrada"
                  onClick={() => onEnter(product)}
                >
                  <PackagePlusIcon />
                </IconAction>
                {onAdjust && (
                  <IconAction
                    label={`Ajustar estoque de ${product.name}`}
                    tooltip="Ajustar estoque"
                    onClick={() => onAdjust(product)}
                  >
                    <SlidersHorizontalIcon />
                  </IconAction>
                )}
                {onHistory && (
                  <IconAction
                    label={`Ver histórico de ${product.name}`}
                    tooltip="Ver histórico"
                    onClick={() => onHistory(product)}
                  >
                    <HistoryIcon />
                  </IconAction>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StockStack({
  products,
  highlightedId,
  onEnter,
  onAdjust,
  onHistory,
}: StockListProps) {
  return (
    <ul aria-label="Estoque" className="divide-y">
      {products.map((product) => (
        <li
          key={product.id}
          data-highlighted={highlight(product, highlightedId)}
          className="flex flex-col gap-3 px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <ProductAvatar
              id={product.id}
              name={product.name}
              className="size-10"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{product.name}</span>
              <span className="type-meta tabular-nums text-muted-foreground">
                {product.barcode}
              </span>
            </div>
            {/* Não modal: o diálogo que a ação abre recebe o foco sem disputar com o menu. */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mt-1 -mr-2 shrink-0"
                  aria-label={`Ações de ${product.name}`}
                >
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => onEnter(product)}>
                    <PackagePlusIcon />
                    Registrar entrada
                  </DropdownMenuItem>
                  {onAdjust && (
                    <DropdownMenuItem onSelect={() => onAdjust(product)}>
                      <SlidersHorizontalIcon />
                      Ajustar estoque
                    </DropdownMenuItem>
                  )}
                  {onHistory && (
                    <DropdownMenuItem onSelect={() => onHistory(product)}>
                      <HistoryIcon />
                      Ver histórico
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pl-13">
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums">
                {formatUnits(product.stock_quantity)}
              </span>
              <span className="type-meta text-muted-foreground">
                mín. <Minimum value={product.min_stock} />
              </span>
            </span>
            <StockStatusPill
              status={product.stock_status}
              shortfall={product.shortfall}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export function StockListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando o estoque…"
      className="flex flex-col divide-y"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-brand-gradient text-white shadow-glow-brand [&_svg:not([class*='size-'])]:size-7"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

export function StockEmpty() {
  return (
    <EmptyState
      icon={<PackageOpenIcon />}
      title="Nenhum produto cadastrado ainda."
      description="O estoque começa no catálogo: cadastre os produtos e volte para registrar as entradas."
    >
      <Button asChild variant="highlight" className="h-10 px-5">
        <Link to="/products">Ir para Produtos</Link>
      </Button>
    </EmptyState>
  );
}

export function StockNoResults({
  term,
  onClear,
}: {
  term: string;
  onClear: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchXIcon />}
      title={`Nenhum produto encontrado para “${term}”.`}
      description="Confira a grafia ou busque por outra parte do nome."
    >
      <Button variant="outline" onClick={onClear}>
        Limpar busca
      </Button>
    </EmptyState>
  );
}

export function StockLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="bg-card">
      <TriangleAlertIcon />
      <AlertTitle>Não foi possível carregar o estoque.</AlertTitle>
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
