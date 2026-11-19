import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type ProductsPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/**
 * Paginação da lista (FR-002): onde o lojista está, quantas páginas existem e os
 * números para pular direto; a página atual fica em índigo (DESIGN.md).
 */
export function ProductsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: ProductsPaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6"
    >
      <div className="flex flex-col">
        <p className="text-sm text-muted-foreground">
          Mostrando {first}–{last} de {total}
        </p>
        <p className="type-meta text-muted-foreground/80 tabular-nums">
          Página {page} de {pages}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        {pageItems(page, pages).map((item, index, items) =>
          item === "gap" ? (
            <span
              // A reticência é identificada pelo número que vem antes dela.
              key={`gap-after-${items[index - 1]}`}
              aria-hidden="true"
              className="hidden w-6 text-center text-muted-foreground sm:inline"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant="ghost"
              size="icon"
              aria-label={`Página ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                "font-semibold tabular-nums",
                item === page
                  ? "bg-primary text-primary-foreground shadow-glow-brand hover:bg-primary hover:text-primary-foreground"
                  : "hidden text-muted-foreground sm:inline-flex",
              )}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          aria-label="Próxima página"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </nav>
  );
}
