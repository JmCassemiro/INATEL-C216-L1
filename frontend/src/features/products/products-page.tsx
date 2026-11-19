/**
 * Seção de produtos: orquestra a busca, a lista e a paginação. A busca e a página
 * vivem na URL; os dados vêm do TanStack Query (research D5 e D6).
 */
import { PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  ProductsEmpty,
  ProductsList,
  ProductsListSkeleton,
  ProductsLoadError,
  ProductsNoResults,
} from "./products-list";
import { ProductsPagination } from "./products-pagination";
import { PAGE_SIZE, useProductsPage } from "./queries";
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

  function openCreate() {
    // O formulário de cadastro entra na US2.
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
        <ProductsList products={data.items} />
        <ProductsPagination
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-page-title">Produtos</h1>
          <p
            className="type-meta min-h-[1.4em] text-muted-foreground"
            aria-live="polite"
          >
            {data && data.total > 0 && !query.isError
              ? countLabel(data.total, Boolean(search))
              : null}
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          Novo produto
        </Button>
      </div>

      <InputGroup className="max-w-md bg-card">
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

      {query.isError ? (
        content
      ) : (
        <section className="overflow-hidden rounded-xl border bg-card">
          {content}
        </section>
      )}
    </div>
  );
}
