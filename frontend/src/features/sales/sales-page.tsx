/**
 * Vendas (spec 004, US3): indicadores do dia, o histórico paginado (página na URL) e o
 * detalhe de cada venda num painel lateral.
 */
import { ReceiptTextIcon, ScanBarcodeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { useListParams } from "@/lib/use-list-params";
import { PAGE_SIZE, useSalesPage } from "./queries";
import { SaleDetailSheet } from "./sale-detail-sheet";
import {
  SalesEmpty,
  SalesList,
  SalesListSkeleton,
  SalesLoadError,
} from "./sales-list";
import { SalesOverview } from "./sales-overview";
import type { Sale } from "./types";

function countLabel(total: number): string {
  return total === 1 ? "1 venda" : `${total} vendas`;
}

export function SalesPage() {
  const { page, setPage } = useListParams();
  const query = useSalesPage(page);
  const data = query.data;

  // Página além da última (endereço antigo ou digitado): vai para a última que existe.
  const lastPage = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useEffect(() => {
    if (data && !query.isPlaceholderData && data.total > 0 && page > lastPage) {
      setPage(lastPage, { replace: true });
    }
  }, [data, query.isPlaceholderData, page, lastPage, setPage]);

  const [detail, setDetail] = useState<Sale | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  let content: React.ReactNode;
  if (query.isError) {
    content = <SalesLoadError onRetry={() => query.refetch()} />;
  } else if (!data) {
    content = <SalesListSkeleton />;
  } else if (data.total === 0) {
    content = <SalesEmpty />;
  } else {
    content = (
      <>
        <SalesList
          sales={data.items}
          onOpen={(sale) => {
            setDetail(sale);
            setDetailOpen(true);
          }}
        />
        <ListPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Vendas | NexoPDV</title>
      <section className="relative isolate overflow-hidden rounded-3xl bg-night-glow px-6 py-7 text-night-foreground shadow-lg sm:px-8 sm:py-8">
        <div className="bg-grid-faint absolute inset-0 -z-10 opacity-60" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 text-sm font-medium text-night-muted">
              <ReceiptTextIcon className="size-4" aria-hidden="true" />
              Movimento da loja
            </p>
            <h1 className="type-page-title">Vendas</h1>
            <p className="max-w-xl text-night-muted">
              Tudo o que passou pelo caixa, com itens, pagamentos e troco.
            </p>
            <p
              className="type-meta min-h-[1.4em] font-semibold text-price-tag"
              aria-live="polite"
            >
              {data && data.total > 0 && !query.isError
                ? countLabel(data.total)
                : null}
            </p>
          </div>
          <Button asChild variant="highlight" className="h-11 px-6">
            <Link to="/sales/new">
              <ScanBarcodeIcon data-icon="inline-start" />
              Nova venda
            </Link>
          </Button>
        </div>
      </section>

      <SalesOverview />

      <section
        aria-label="Histórico de vendas"
        className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
      >
        {content}
      </section>

      <SaleDetailSheet
        sale={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
