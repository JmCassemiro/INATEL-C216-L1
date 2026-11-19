/**
 * Lista de produtos e os estados dela (FR-001, FR-006). No desktop é uma tabela,
 * com a coluna de etiquetas de preço à direita (a "borda da prateleira"); abaixo
 * de 640 px vira uma lista empilhada (FR-020).
 */
import { PackageOpenIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
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
import { useIsMobile } from "@/lib/use-is-mobile";
import { PriceTag } from "./price-tag";
import type { Product } from "./types";

type ProductsListProps = {
  products: Product[];
  /** Produto que acabou de mudar: a linha recebe o destaque amarelo (research D14). */
  highlightedId?: string | null;
};

function highlight(product: Product, highlightedId?: string | null) {
  return product.id === highlightedId ? "true" : undefined;
}

export function ProductsList({ products, highlightedId }: ProductsListProps) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <ProductsStack products={products} highlightedId={highlightedId} />
  ) : (
    <ProductsTable products={products} highlightedId={highlightedId} />
  );
}

function ProductsTable({ products, highlightedId }: ProductsListProps) {
  return (
    <Table aria-label="Produtos" className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Produto</TableHead>
          <TableHead className="w-40">Código de barras</TableHead>
          <TableHead className="w-36 pr-4 text-right">Preço</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow
            key={product.id}
            data-highlighted={highlight(product, highlightedId)}
          >
            <TableCell className="py-3 pl-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium" title={product.name}>
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
            </TableCell>
            <TableCell className="tabular-nums tracking-[0.02em]">
              {product.barcode}
            </TableCell>
            <TableCell className="pr-4 text-right">
              <PriceTag price={product.price} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProductsStack({ products, highlightedId }: ProductsListProps) {
  return (
    <ul aria-label="Produtos" className="divide-y">
      {products.map((product) => (
        <li
          key={product.id}
          data-highlighted={highlight(product, highlightedId)}
          className="flex flex-col gap-2 px-4 py-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{product.name}</span>
            {product.description && (
              <span className="type-meta truncate text-muted-foreground">
                {product.description}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="type-meta tabular-nums tracking-[0.02em] text-muted-foreground">
              {product.barcode}
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
        <div key={row} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ProductsEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpenIcon />
        </EmptyMedia>
        <EmptyTitle>Nenhum produto cadastrado ainda.</EmptyTitle>
        <EmptyDescription>
          Cadastre o primeiro produto para começar a vender.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate}>Cadastrar produto</Button>
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
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>Nenhum produto com “{term}”.</EmptyTitle>
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
