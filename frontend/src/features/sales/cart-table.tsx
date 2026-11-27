/**
 * Itens da venda em andamento (spec 004, FR-005 a FR-007): tabela no desktop e lista
 * empilhada no celular, como as outras seções. A quantidade é digitada ou ajustada
 * pelos botões; o que a API recusou aparece junto da linha (research D16).
 */
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductAvatar } from "@/features/products/product-avatar";
import { formatCents, formatPrice, toCents } from "@/lib/money";
import { parseQuantity } from "@/lib/quantity";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { type CartLine, MAX_LINE_QUANTITY, quantityCheck } from "./cart";

type CartTableProps = {
  lines: CartLine[];
  onQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
};

export function CartTable({ lines, onQuantity, onRemove }: CartTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ul aria-label="Itens da venda" className="divide-y">
        {lines.map((line) => (
          <li key={line.product.id} className="flex flex-col gap-3 px-4 py-4">
            <ProductCell line={line} />
            <div className="flex items-center justify-between gap-3">
              <QuantityStepper line={line} onQuantity={onQuantity} />
              <span className="font-bold tabular-nums">{subtotal(line)}</span>
              <RemoveButton line={line} onRemove={onRemove} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table aria-label="Itens da venda">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-6">Produto</TableHead>
          <TableHead className="text-right">Preço</TableHead>
          <TableHead className="text-center">Quantidade</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
          <TableHead className="w-14 pr-6">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.product.id} className="align-top">
            <TableCell className="py-3 pl-6">
              <ProductCell line={line} />
            </TableCell>
            <TableCell className="py-4 text-right text-muted-foreground tabular-nums">
              {formatPrice(line.product.price)}
            </TableCell>
            <TableCell className="py-3">
              <div className="flex justify-center">
                <QuantityStepper line={line} onQuantity={onQuantity} />
              </div>
            </TableCell>
            <TableCell className="py-4 text-right font-bold tabular-nums">
              {subtotal(line)}
            </TableCell>
            <TableCell className="py-3 pr-6">
              <RemoveButton line={line} onRemove={onRemove} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function subtotal(line: CartLine): string {
  return formatCents(toCents(line.product.price) * line.quantity);
}

const PROBLEM_TEXT = {
  price_changed: () => "Preço atualizado",
  insufficient_stock: (line: CartLine) =>
    `Há só ${line.product.stock_quantity} un.`,
  unavailable: () => "Fora do catálogo",
} as const;

function ProductCell({ line }: { line: CartLine }) {
  const { product, problem } = line;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductAvatar id={product.id} name={product.name} className="size-10" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="type-meta text-muted-foreground tabular-nums tracking-[0.04em]">
          {product.barcode}
        </p>
        {problem && (
          <p
            className={cn(
              "type-meta mt-1 inline-flex rounded-full px-2 py-0.5 font-semibold",
              problem.reason === "price_changed"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {PROBLEM_TEXT[problem.reason](line)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Quantidade digitada (validada antes de mudar o carrinho) ou por − e +. */
function QuantityStepper({
  line,
  onQuantity,
}: {
  line: CartLine;
  onQuantity: (productId: string, quantity: number) => void;
}) {
  const { product, quantity } = line;
  const [text, setText] = useState(String(quantity));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  // A quantidade mudou por fora (nova leitura, botões): o campo acompanha.
  useEffect(() => {
    setText(String(quantity));
    setError(null);
  }, [quantity]);

  function change(value: string) {
    setText(value);
    const parsed = parseQuantity(value, { min: 1, max: MAX_LINE_QUANTITY });
    const problem = parsed.ok
      ? quantityCheck(line, parsed.value)
      : parsed.error;
    setError(problem);
    if (parsed.ok && !problem) onQuantity(product.id, parsed.value);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Diminuir ${product.name}`}
          disabled={quantity <= 1}
          onClick={() => onQuantity(product.id, quantity - 1)}
        >
          <MinusIcon />
        </Button>
        <Input
          inputMode="numeric"
          autoComplete="off"
          aria-label={`Quantidade de ${product.name}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-8 w-14 text-center tabular-nums"
          value={text}
          onChange={(event) => change(event.target.value)}
          onBlur={() => {
            setText(String(quantity));
            setError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Aumentar ${product.name}`}
          disabled={quantityCheck(line, quantity + 1) !== null}
          onClick={() => onQuantity(product.id, quantity + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          className="type-meta max-w-40 text-center text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function RemoveButton({
  line,
  onRemove,
}: {
  line: CartLine;
  onRemove: (productId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remover ${line.product.name}`}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      onClick={() => onRemove(line.product.id)}
    >
      <Trash2Icon />
    </Button>
  );
}
