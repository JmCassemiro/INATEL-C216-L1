/**
 * Lista de produtos e os estados dela (FR-001, FR-006). No desktop é uma tabela,
 * com a coluna de etiquetas de preço à direita (a "borda da prateleira"); abaixo
 * de 640 px vira uma lista empilhada (FR-020).
 */
import {
  EllipsisVerticalIcon,
  PackageOpenIcon,
  PencilIcon,
  SearchXIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StockStatusPill } from "@/features/stock/stock-status";
import { formatUnits } from "@/lib/quantity";
import { useIsMobile } from "@/lib/use-is-mobile";
import { gtinKind } from "./gtin";
import { PriceTag } from "./price-tag";
import { ProductAvatar } from "./product-avatar";
import type { Product } from "./types";

type ProductsListProps = {
  products: Product[];
  /** Produto que acabou de mudar: a linha recebe o destaque amarelo (research D14). */
  highlightedId?: string | null;
  onEdit: (product: Product) => void;
  onRemove: (product: Product) => void;
};

function highlight(product: Product, highlightedId?: string | null) {
  return product.id === highlightedId ? "true" : undefined;
}

export function ProductsList(props: ProductsListProps) {
  const isMobile = useIsMobile();
  return isMobile ? <ProductsStack {...props} /> : <ProductsTable {...props} />;
}

function ProductsTable({
  products,
  highlightedId,
  onEdit,
  onRemove,
}: ProductsListProps) {
  return (
    <Table aria-label="Produtos" className="table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="type-eyebrow h-11 pl-6 text-muted-foreground">
            Produto
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-44 text-muted-foreground">
            Código de barras
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-32 text-muted-foreground">
            Estoque
          </TableHead>
          <TableHead className="type-eyebrow h-11 w-36 text-right text-muted-foreground">
            Preço
          </TableHead>
          <TableHead className="w-28 pr-6">
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
            <TableCell className="py-3.5 pl-6">
              <div className="flex min-w-0 items-center gap-3">
                <ProductAvatar id={product.id} name={product.name} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-semibold" title={product.name}>
                    {product.name}
                  </span>
                  {product.description && (
                    <span
                      className="type-meta truncate text-muted-foreground"
                      title={product.description}
                    >
                      {product.description}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-start gap-1">
                <span className="text-[13px] tabular-nums tracking-[0.04em] text-muted-foreground">
                  {product.barcode}
                </span>
                <BarcodeKind code={product.barcode} />
              </div>
            </TableCell>
            <TableCell>
              <StockCell product={product} />
            </TableCell>
            <TableCell className="text-right">
              <PriceTag price={product.price} />
            </TableCell>
            <TableCell className="pr-6">
              <div className="flex justify-end gap-1">
                <IconAction
                  label={`Editar ${product.name}`}
                  tooltip="Editar"
                  onClick={() => onEdit(product)}
                >
                  <PencilIcon />
                </IconAction>
                <IconAction
                  label={`Remover ${product.name}`}
                  tooltip="Remover"
                  onClick={() => onRemove(product)}
                >
                  <Trash2Icon />
                </IconAction>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Saldo e, se não estiver em dia, a situação (spec 011, FR-025). */
function StockCell({ product }: { product: Product }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-semibold tabular-nums">
        {formatUnits(product.stock_quantity)}
      </span>
      {product.stock_status !== "ok" && (
        <StockStatusPill status={product.stock_status} />
      )}
    </div>
  );
}

/** Pílula com o padrão do código (EAN-13, UPC-A…), derivado do próprio código. */
function BarcodeKind({ code }: { code: string }) {
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground ring-1 ring-primary/15">
      {gtinKind(code)}
    </span>
  );
}

function IconAction({
  label,
  tooltip,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ProductsStack({
  products,
  highlightedId,
  onEdit,
  onRemove,
}: ProductsListProps) {
  return (
    <ul aria-label="Produtos" className="divide-y">
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
              {product.description && (
                <span className="type-meta truncate text-muted-foreground">
                  {product.description}
                </span>
              )}
              <span className="mt-1 flex items-center gap-2">
                <span className="type-meta font-semibold tabular-nums">
                  {formatUnits(product.stock_quantity)}
                </span>
                {product.stock_status !== "ok" && (
                  <StockStatusPill status={product.stock_status} />
                )}
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
                  <DropdownMenuItem onSelect={() => onEdit(product)}>
                    <PencilIcon />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onRemove(product)}
                  >
                    <Trash2Icon />
                    Remover
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-between gap-3 pl-13">
            <span className="flex flex-wrap items-center gap-2">
              <span className="type-meta tabular-nums tracking-[0.04em] text-muted-foreground">
                {product.barcode}
              </span>
              <BarcodeKind code={product.barcode} />
            </span>
            <PriceTag price={product.price} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export function ProductsListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando produtos"
      className="flex flex-col divide-y"
    >
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ProductsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-brand-gradient text-white shadow-glow-brand [&_svg:not([class*='size-'])]:size-7"
        >
          <PackageOpenIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold">
          Nenhum produto cadastrado ainda.
        </EmptyTitle>
        <EmptyDescription>
          Cadastre o primeiro produto para começar a vender.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="highlight" className="h-10 px-5" onClick={onCreate}>
          Cadastrar produto
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ProductsNoResults({
  term,
  onClear,
}: {
  term: string;
  onClear: () => void;
}) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-14 rounded-2xl bg-brand-gradient text-white shadow-glow-brand [&_svg:not([class*='size-'])]:size-7"
        >
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold">
          Nenhum produto com “{term}”.
        </EmptyTitle>
        <EmptyDescription>
          Confira a grafia ou busque por outra parte do nome.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          Limpar busca
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ProductsLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="bg-card">
      <TriangleAlertIcon />
      <AlertTitle>Não foi possível carregar os produtos.</AlertTitle>
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
