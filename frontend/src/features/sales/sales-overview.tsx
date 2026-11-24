/**
 * Indicadores do dia (spec 004, FR-023): vendas, faturamento e ticket médio, só com
 * as vendas de hoje no fuso do navegador. Valores em dinheiro em amarelo de etiqueta.
 */
import { BanknoteIcon, ReceiptIcon, ShoppingCartIcon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatPrice } from "@/lib/money";
import { formatQuantity } from "@/lib/quantity";
import { useTodaySummary } from "./queries";

const NO_VALUE = "—";

export function SalesOverview() {
  const query = useTodaySummary();
  const data = query.data;

  /** Valor do cartão: esqueleto carregando, travessão com erro. */
  function value(render: () => string) {
    if (query.isError) return NO_VALUE;
    return data ? render() : undefined;
  }

  return (
    <section
      aria-label="Indicadores de hoje"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
    >
      <StatCard
        label="Vendas hoje"
        icon={ShoppingCartIcon}
        value={value(() => formatQuantity(data?.count ?? 0))}
        hint="vendas registradas desde a meia-noite"
      />
      <StatCard
        label="Faturamento hoje"
        icon={BanknoteIcon}
        tone="tag"
        value={value(() => formatPrice(data?.revenue ?? "0.00"))}
        hint="soma dos totais das vendas de hoje"
      />
      <StatCard
        label="Ticket médio hoje"
        icon={ReceiptIcon}
        tone="tag"
        className="col-span-2 xl:col-span-1"
        value={value(() => formatPrice(data?.average_ticket ?? "0.00"))}
        hint="faturamento dividido pelo número de vendas"
      />
    </section>
  );
}
