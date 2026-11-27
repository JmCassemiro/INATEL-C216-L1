/**
 * Itens, pagamentos e totais de uma venda registrada: o mesmo bloco no comprovante e
 * no detalhe do histórico (spec 004, FR-017, FR-022).
 */
import { formatPrice } from "@/lib/money";
import { PAYMENT_LABELS } from "./payment-methods";
import type { Sale } from "./types";

export function SaleBreakdown({ sale }: { sale: Sale }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <ul aria-label="Itens" className="flex flex-col gap-2">
        {sale.items.map((item) => (
          <li key={item.product_id} className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {item.quantity} × {item.name}
              </span>
              <span className="type-meta text-muted-foreground tabular-nums">
                {formatPrice(item.unit_price)} cada · {item.barcode}
              </span>
            </span>
            <span className="font-semibold tabular-nums">
              {formatPrice(item.subtotal)}
            </span>
          </li>
        ))}
      </ul>

      <ul
        aria-label="Pagamentos"
        className="flex flex-col gap-1.5 border-t border-dashed pt-3"
      >
        {sale.payments.map((payment, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: pagamentos não têm id próprio e não mudam.
            key={index}
            className="flex justify-between gap-3"
          >
            <span>{PAYMENT_LABELS[payment.method]}</span>
            <span className="tabular-nums">{formatPrice(payment.amount)}</span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-dashed pt-3">
        <dt className="font-bold">Total</dt>
        <dd className="text-right font-bold tabular-nums">
          {formatPrice(sale.total)}
        </dd>
        <dt className="text-muted-foreground">Pago</dt>
        <dd className="text-right tabular-nums">{formatPrice(sale.paid)}</dd>
        <dt className="text-muted-foreground">Troco</dt>
        <dd className="text-right tabular-nums">{formatPrice(sale.change)}</dd>
      </dl>
    </div>
  );
}
