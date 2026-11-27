/**
 * Leitura do produto (spec 004, research D15): o leitor USB digita o código e tecla
 * Enter; depois de cada leitura o campo fica limpo e com o foco, para bips seguidos.
 * Sem código legível, a busca pelo nome lista até 5 produtos.
 */
import { useQuery } from "@tanstack/react-query";
import { ScanBarcodeIcon, SearchIcon } from "lucide-react";
import { type FormEvent, type RefObject, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { listProducts } from "@/features/products/api";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api-client";
import { formatPrice } from "@/lib/money";
import { formatUnits } from "@/lib/quantity";
import { PRODUCTS_KEY } from "@/lib/query-keys";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { findProductByBarcode } from "./api";

const NOT_FOUND = "Produto não encontrado";
const SEARCH_SIZE = 5;

type BarcodeReaderProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  /** Tenta pôr o produto no carrinho; devolve o motivo da recusa, ou `null`. */
  onProduct: (product: Product) => string | null;
};

export function BarcodeReader({ inputRef, onProduct }: BarcodeReaderProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  function add(product: Product) {
    const refusal = onProduct(product);
    setMessage(
      refusal
        ? { text: refusal, ok: false }
        : { text: `${product.name} adicionado`, ok: true },
    );
  }

  async function read(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = code.replace(/\s+/g, "");
    setCode("");
    inputRef.current?.focus();
    if (!typed) return;
    try {
      add(await findProductByBarcode(typed));
    } catch (error) {
      // Código inexistente (404) ou inválido (422) é "não encontrado"; o resto, a
      // mensagem do cliente HTTP (ex.: sem conexão).
      const lookupFailed =
        error instanceof ApiError &&
        error.kind !== "not-found" &&
        error.kind !== "validation";
      setMessage({ text: lookupFailed ? error.message : NOT_FOUND, ok: false });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={read}>
        <Field>
          <FieldLabel htmlFor="sale-barcode">Código de barras</FieldLabel>
          <div className="flex gap-2">
            <InputGroup className="h-12 flex-1 bg-background">
              <InputGroupAddon>
                <ScanBarcodeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="sale-barcode"
                ref={inputRef}
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                className="text-base tabular-nums tracking-wide"
                aria-describedby="sale-barcode-description"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </InputGroup>
            <Button
              type="submit"
              className="h-12 rounded-xl px-5 font-semibold shadow-glow-brand"
            >
              Adicionar
            </Button>
          </div>
          <FieldDescription id="sale-barcode-description">
            Leia com o leitor ou digite e tecle Enter.
          </FieldDescription>
        </Field>
      </form>

      <p
        role="status"
        aria-label="Leitura"
        className={cn(
          "type-meta -mt-2 min-h-[1.4em] font-semibold",
          message?.ok ? "text-success" : "text-destructive",
        )}
      >
        {message?.text}
      </p>

      <NameSearch
        onPick={(product) => {
          add(product);
          inputRef.current?.focus();
        }}
      />
    </div>
  );
}

/** Busca pelo nome, para o produto sem código legível (US1-4). */
function NameSearch({ onPick }: { onPick: (product: Product) => void }) {
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 250);
  const results = useQuery({
    queryKey: [...PRODUCTS_KEY, "sale-search", search],
    queryFn: () => listProducts({ search, page: 1, size: SEARCH_SIZE }),
    enabled: search.length > 0,
  });
  const items = search ? (results.data?.items ?? []) : [];

  return (
    <div className="flex flex-col gap-2">
      <InputGroup className="h-10 bg-background">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Buscar pelo nome"
          placeholder="Sem código? Busque pelo nome"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </InputGroup>
      {search && results.data && items.length === 0 && (
        <p className="type-meta px-1 text-muted-foreground">
          Nenhum produto encontrado para “{search}”.
        </p>
      )}
      {items.length > 0 && (
        <ul
          aria-label="Produtos encontrados"
          className="divide-y rounded-xl ring-1 ring-border"
        >
          {items.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.name}</p>
                <p className="type-meta text-muted-foreground tabular-nums">
                  {formatPrice(product.price)} ·{" "}
                  {formatUnits(product.stock_quantity)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3"
                aria-label={`Adicionar ${product.name}`}
                onClick={() => {
                  onPick(product);
                  setTerm("");
                }}
              >
                Adicionar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
