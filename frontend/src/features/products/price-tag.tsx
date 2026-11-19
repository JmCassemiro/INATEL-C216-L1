import { formatPrice, splitPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceTagProps = {
  price: string;
  /** `list`: na coluna de preços; `label`: na prévia da etiqueta de gôndola. */
  size?: "list" | "label";
  className?: string;
};

/**
 * Etiqueta de preço (DESIGN.md): amarelo de etiqueta, numeral condensado e pesado,
 * "R$" pequeno e centavos menores e elevados. Leitores de tela ouvem o preço
 * inteiro ("R$ 49,90"); as partes visuais ficam ocultas para eles.
 */
export function PriceTag({ price, size = "list", className }: PriceTagProps) {
  const { integer, cents } = splitPrice(price);
  return (
    <span
      className={cn(
        "inline-flex rounded-sm border border-price-tag-border bg-price-tag text-price-tag-foreground",
        size === "list"
          ? "type-price-list px-1.5 py-1"
          : "type-price-label px-3 py-2",
        className,
      )}
    >
      <span className="sr-only">{formatPrice(price)}</span>
      <span aria-hidden="true" className="inline-flex items-start">
        <span className="type-price-currency">R$</span>
        <span>{integer}</span>
        <span className="type-price-cents">,{cents}</span>
      </span>
    </span>
  );
}
