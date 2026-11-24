/**
 * Seção de produtos: orquestra a busca, a lista e a paginação. A busca e a página
 * vivem na URL; os dados vêm do TanStack Query (research D5 e D6).
 */
import { PackageIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CatalogOverview } from "./catalog-overview";
import { DeleteProductDialog } from "./delete-product-dialog";
import { PriceTag } from "./price-tag";
import { ProductFormSheet } from "./product-form-sheet";
import {
  ProductsEmpty,
  ProductsList,
  ProductsListSkeleton,
  ProductsLoadError,
  ProductsNoResults,
} from "./products-list";
import { ProductsPagination } from "./products-pagination";
import { PAGE_SIZE, useCatalogFirstPage, useProductsPage } from "./queries";
import type { Product } from "./types";
import { useProductListParams } from "./use-product-list-params";

function countLabel(total: number, searching: boolean): string {
  if (searching)
    return total === 1
      ? "1 produto encontrado"
      : `${total} produtos encontrados`;
  return total === 1
    ? "1 produto no catálogo"
    : `${total} produtos no catálogo`;
}

/**
 * Faixa de título (DESIGN.md): superfície noturna com brilho, a ação principal em
 * amarelo e, como enfeite, a etiqueta inclinada com o preço do produto mais novo.
 */
function PageBand({
  count,
  onCreate,
}: {
  count: string | null;
  onCreate: () => void;
}) {
  const newest = useCatalogFirstPage().data?.items[0];
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-night-glow px-6 py-7 text-night-foreground shadow-lg sm:px-8 sm:py-8">
      <div className="bg-grid-faint absolute inset-0 -z-10 opacity-60" />
      {newest && (
        <PriceTag
          price={newest.price}
          size="label"
          decorative
          className="absolute top-1/2 right-10 hidden -translate-y-1/2 -rotate-6 rounded-md border-0 px-5 py-3 shadow-xl ring-4 ring-white/10 lg:inline-flex"
        />
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:pr-72">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm font-medium text-night-muted">
            <PackageIcon className="size-4" aria-hidden="true" />
            Catálogo da loja
          </p>
          <h1 className="type-page-title">Produtos</h1>
          <p className="max-w-xl text-night-muted">
            Cadastre, ajuste preços e acompanhe o que está na prateleira.
          </p>
          <p
            className="type-meta min-h-[1.4em] font-semibold text-price-tag"
            aria-live="polite"
          >
            {count}
          </p>
        </div>
        <Button
          variant="highlight"
          className="h-11 shrink-0 self-start px-5 sm:self-auto"
          onClick={onCreate}
        >
          <PlusIcon data-icon="inline-start" />
          Novo produto
        </Button>
      </div>
    </section>
  );
}

export function ProductsPage() {
  const { search, page, setSearch, setPage } = useProductListParams();
  const query = useProductsPage(search, page);
  const data = query.data;

  // O campo de busca é local; o termo vai para a URL depois de uma pausa (FR-003).
  const [term, setTerm] = useState(search);
  const debouncedTerm = useDebouncedValue(term);
  const submittedTerm = useRef(search);

  useEffect(() => {
    const trimmed = debouncedTerm.trim();
    if (trimmed !== submittedTerm.current) {
      submittedTerm.current = trimmed;
      setSearch(trimmed);
    }
  }, [debouncedTerm, setSearch]);

  // A URL mudou por fora (voltar do navegador): o campo acompanha.
  useEffect(() => {
    if (search !== submittedTerm.current) {
      submittedTerm.current = search;
      setTerm(search);
    }
  }, [search]);

  // Página além da última (endereço antigo ou digitado): vai para a última que existe.
  const lastPage = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  useEffect(() => {
    if (data && !query.isPlaceholderData && data.total > 0 && page > lastPage) {
      setPage(lastPage, { replace: true });
    }
  }, [data, query.isPlaceholderData, page, lastPage, setPage]);

  function clearSearch() {
    submittedTerm.current = "";
    setTerm("");
    setSearch("");
  }

  // Cada aviso tem um id fixo: o mesmo aviso de novo substitui o anterior em vez de empilhar.
  // Formulário (cadastro ou edição) e linha destacada depois de salvar (research D14).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = setTimeout(() => setHighlightedId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function handleSaved(product: Product) {
    setFormOpen(false);
    setHighlightedId(product.id);
    if (editing) {
      toast.success("Alterações salvas", { id: "product-updated" });
      return;
    }
    toast.success("Produto cadastrado", { id: "product-created" });
    // O produto novo fica no topo da primeira página, sem busca (FR-005).
    if (search || page !== 1) clearSearch();
  }

  /** O produto sumiu (removido em outra aba): avisa; a lista já foi recarregada (FR-016). */
  function handleNotFound() {
    setFormOpen(false);
    setRemoveOpen(false);
    toast.warning("Este produto não existe mais. A lista foi atualizada.", {
      id: "product-not-found",
    });
  }

  // Remoção com confirmação (FR-013).
  const [removing, setRemoving] = useState<Product | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  function openRemove(product: Product) {
    setRemoving(product);
    setRemoveOpen(true);
  }

  function handleRemoved() {
    setRemoveOpen(false);
    toast.success("Produto removido", { id: "product-removed" });
    // Era o último da página: mostra a anterior em vez de uma página vazia (FR-014).
    if (data?.items.length === 1 && page > 1) setPage(page - 1);
  }

  let content: React.ReactNode;
  if (query.isError) {
    content = <ProductsLoadError onRetry={() => query.refetch()} />;
  } else if (!data) {
    content = <ProductsListSkeleton />;
  } else if (data.total === 0) {
    content = search ? (
      <ProductsNoResults term={search} onClear={clearSearch} />
    ) : (
      <ProductsEmpty onCreate={openCreate} />
    );
  } else {
    content = (
      <>
        <ProductsList
          products={data.items}
          highlightedId={highlightedId}
          onEdit={openEdit}
          onRemove={openRemove}
        />
        <ProductsPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      </>
    );
  }

  const searchField = (
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
  );

  return (
    <div className="flex flex-col gap-6">
      <title>Produtos | NexoPDV</title>
      <PageBand
        count={
          data && data.total > 0 && !query.isError
            ? countLabel(data.total, Boolean(search))
            : null
        }
        onCreate={openCreate}
      />

      <CatalogOverview />

      {query.isError ? (
        <>
          {searchField}
          {content}
        </>
      ) : (
        <section
          aria-label="Lista de produtos"
          className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
        >
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 sm:px-6">
            {searchField}
            {search && (
              <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                Filtrando por “{search}”
              </span>
            )}
          </div>
          {content}
        </section>
      )}

      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSaved={handleSaved}
        onNotFound={handleNotFound}
      />
      <DeleteProductDialog
        product={removing}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onRemoved={handleRemoved}
        onNotFound={handleNotFound}
      />
    </div>
  );
}
