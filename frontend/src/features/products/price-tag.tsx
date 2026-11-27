import { formatPrice, splitPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  price: string;
  /** `list`: na coluna de preços; `label`: na prévia da etiqueta de gôndola. */
  size?: "list" | "label";
  /** Enfeite (faixa de título, site): oculto para leitor de tela, sem o texto do preço. */
  decorative?: boolean;
  className?: string;
};

/**
 * Etiqueta de preço (DESIGN.md): amarelo de etiqueta, numeral condensado e pesado,
 * "R$" pequeno e centavos menores e elevados. Leitores de tela ouvem o preço
 * inteiro ("R$ 49,90"); as partes visuais ficam ocultas para eles.
 */
export function PriceTag({
  price,
  size = "list",
  decorative = false,
  className,
}: PriceTagProps) {
  const { integer, cents } = splitPrice(price);
  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex rounded-sm border border-price-tag-border bg-price-tag text-price-tag-foreground",
        size === "list"
          ? "type-price-list -rotate-1 px-2 py-1 shadow-xs"
          : "type-price-label px-3 py-2",
        className,
      )}
    >
      {!decorative && <span className="sr-only">{formatPrice(price)}</span>}
      <span aria-hidden="true" className="inline-flex items-start">
        <span className="type-price-currency">R$</span>
        <span>{integer}</span>
        <span className="type-price-cents">,{cents}</span>
      </span>
    </span>
  );
}
