/**
 * Seção Estoque (spec 011): a posição de estoque com busca e paginação na URL e as
 * ações de cada produto. Os dados vêm do TanStack Query (research D13).
 */
import { BoxesIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/list-pagination";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import type { Product } from "@/features/products/types";
import { formatUnits } from "@/lib/quantity";
import { useSearchTerm } from "@/lib/use-search-term";
import { MovementsSheet } from "./movements-sheet";
import { PAGE_SIZE, type StockView, useStockPage } from "./queries";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import { StockEntryDialog } from "./stock-entry-dialog";
import {
  StockEmpty,
  StockList,
  StockListSkeleton,
  StockLoadError,
  StockNoResults,
  StockNothingToRestock,
} from "./stock-list";
import { StockOverview } from "./stock-overview";
import type { StockMovement } from "./types";
import { useStockListParams } from "./use-stock-list-params";

function countLabel(total: number, view: StockView): string {
  const products = total === 1 ? "1 produto" : `${total} produtos`;
  return view === "restock" ? `${products} para repor` : products;
}

const VIEWS: { value: StockView; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "restock", label: "Para repor" },
];

/** Escolha entre todos os produtos e só os para repor (FR-017). */
function ViewSwitch({
  view,
  onChange,
}: {
  view: StockView;
  onChange: (view: StockView) => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: `fieldset` é para campos de formulário; aqui são dois botões de alternância.
    <div
      role="group"
      aria-label="Mostrar"
      className="inline-flex rounded-full bg-muted p-1"
    >
      {VIEWS.map((option) => (
        <Toggle
          key={option.value}
          pressed={view === option.value}
          onPressedChange={(pressed) => {
            if (pressed) onChange(option.value);
          }}
          className="h-8 rounded-full px-4 font-semibold text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {option.label}
        </Toggle>
      ))}
    </div>
  );
}

/** Faixa de título noturna, no mesmo desenho da seção Produtos (DESIGN.md). */
function PageBand({ count }: { count: string | null }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-night-glow px-6 py-7 text-night-foreground shadow-lg sm:px-8 sm:py-8">
      <div className="bg-grid-faint absolute inset-0 -z-10 opacity-60" />
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-2 text-sm font-medium text-night-muted">
          <BoxesIcon className="size-4" aria-hidden="true" />
          Controle da loja
        </p>
        <h1 className="type-page-title">Estoque</h1>
        <p className="max-w-xl text-night-muted">
          Registre o que chega, corrija o que a contagem mostrar e veja o que
          precisa de reposição.
        </p>
        <p
          className="type-meta min-h-[1.4em] font-semibold text-price-tag"
          aria-live="polite"
        >
          {count}
        </p>
      </div>
    </section>
  );
}

export function StockPage() {
  const { search, page, view, setSearch, setPage, setView } =
    useStockListParams();
  const query = useStockPage(search, page, view);
  const data = query.data;
  const {
    term,
    setTerm,
    clear: clearSearch,
  } = useSearchTerm(search, setSearch);

  // Página além da última (endereço antigo ou digitado): vai para a última que existe.
  const lastPage = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useEffect(() => {
    if (data && !query.isPlaceholderData && data.total > 0 && page > lastPage) {
      setPage(lastPage, { replace: true });
    }
  }, [data, query.isPlaceholderData, page, lastPage, setPage]);

  // Linha destacada depois de uma movimentação (mesmo padrão da seção Produtos).
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const [entering, setEntering] = useState<Product | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);

  function openEntry(product: Product) {
    setEntering(product);
    setEntryOpen(true);
  }

  const [historyOf, setHistoryOf] = useState<Product | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function openHistory(product: Product) {
    setHistoryOf(product);
    setHistoryOpen(true);
  }

  /** Do histórico vazio direto para a primeira entrada. */
  function enterFromHistory(product: Product) {
    setHistoryOpen(false);
    openEntry(product);
  }

  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  function openAdjust(product: Product) {
    setAdjusting(product);
    setAdjustOpen(true);
  }

  function handleAdjusted(product: Product, movement: StockMovement) {
    setAdjustOpen(false);
    setHighlightedId(product.id);
    toast.success(
      `Ajuste salvo: ${product.name} agora tem ${formatUnits(movement.balance_after)}`,
      { id: "stock-adjustment" },
    );
  }

  function handleRegistered(product: Product, movement: StockMovement) {
    setEntryOpen(false);
    setHighlightedId(product.id);
    toast.success(
      `Entrada registrada: ${product.name} agora tem ${formatUnits(movement.balance_after)}`,
      { id: "stock-entry" },
    );
  }

  /** O produto sumiu (removido em outra aba): avisa; a lista já foi recarregada. */
  function handleNotFound() {
    setEntryOpen(false);
    setAdjustOpen(false);
    toast.warning("Este produto não existe mais. A lista foi atualizada.", {
      id: "stock-not-found",
    });
  }

  let content: React.ReactNode;
  if (query.isError) {
    content = <StockLoadError onRetry={() => query.refetch()} />;
  } else if (!data) {
    content = <StockListSkeleton />;
  } else if (data.total === 0) {
    if (search) {
      content = <StockNoResults term={search} onClear={clearSearch} />;
    } else if (view === "restock") {
      content = <StockNothingToRestock />;
    } else {
      content = <StockEmpty />;
    }
  } else {
    content = (
      <>
        <StockList
          products={data.items}
          highlightedId={highlightedId}
          onEnter={openEntry}
          onAdjust={openAdjust}
          onHistory={openHistory}
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
      <title>Estoque | NexoPDV</title>
      <PageBand
        count={
          data && data.total > 0 && !query.isError
            ? countLabel(data.total, view)
            : null
        }
      />

      <StockOverview />

      <section
        aria-label="Posição de estoque"
        className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
      >
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 sm:px-6">
          <InputGroup className="h-10 bg-background sm:max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Buscar pelo nome"
              placeholder="Buscar pelo nome"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </InputGroup>
          <ViewSwitch view={view} onChange={setView} />
        </div>
        {content}
      </section>

      <StockEntryDialog
        product={entering}
        open={entryOpen}
        onOpenChange={setEntryOpen}
        onRegistered={handleRegistered}
        onNotFound={handleNotFound}
      />
      <StockAdjustmentDialog
        product={adjusting}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onAdjusted={handleAdjusted}
        onNotFound={handleNotFound}
      />
      <MovementsSheet
        product={historyOf}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onEnter={enterFromHistory}
      />
    </div>
  );
}
