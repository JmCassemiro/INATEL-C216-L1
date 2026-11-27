/**
 * Prévia da etiqueta de gôndola (FR-022, extra): o lojista vê como o produto vai
 * aparecer na prateleira enquanto preenche o formulário. É o elemento marcante do
 * DESIGN.md: amarelo de etiqueta, preço condensado e as barras de verdade.
 */
import { useId } from "react";
import { parsePriceInput } from "@/lib/money";
import { Barcode } from "./barcode";
import { PriceTag } from "./price-tag";

type ShelfLabelProps = {
  name: string;
  /** Preço como digitado ("49,90"); a etiqueta só mostra o valor quando ele é válido. */
  price: string;
  barcode: string;
};

export function ShelfLabel({ name, price, barcode }: ShelfLabelProps) {
  const captionId = useId();
  const parsedPrice = parsePriceInput(price);

  return (
    <figure aria-labelledby={captionId} className="flex flex-col gap-2">
      <figcaption id={captionId} className="type-meta text-muted-foreground">
        Prévia da etiqueta
      </figcaption>
      <div className="flex flex-col gap-3 rounded-sm border border-price-tag-border bg-price-tag p-3 text-price-tag-foreground">
        <p className="line-clamp-2 min-h-[2.5em] font-semibold leading-tight">
          {name || <span className="opacity-50">Nome do produto</span>}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex w-36 shrink-0 flex-col items-center gap-0.5 rounded-xs bg-white px-2 pt-1.5 pb-1">
            <Barcode code={barcode} className="h-9" />
            <span className="text-[11px] leading-none tracking-[0.08em] tabular-nums">
              {barcode || <span className="opacity-50">Código de barras</span>}
            </span>
          </div>
          {parsedPrice.ok ? (
            <PriceTag
              price={parsedPrice.value}
              size="label"
              className="border-0 bg-transparent p-0"
            />
          ) : (
            <span className="type-price-label opacity-40">R$ —</span>
          )}
        </div>
      </div>
    </figure>
  );
}
