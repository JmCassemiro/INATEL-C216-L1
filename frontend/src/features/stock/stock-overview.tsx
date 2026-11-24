/**
 * Indicadores do estoque (spec 011, FR-018): só dados reais do resumo da API. O valor
 * em estoque é dinheiro, então usa o amarelo da etiqueta; reposição em âmbar e sem
 * estoque em vermelho, como as pílulas de situação.
 */
import { BanknoteIcon, PackageXIcon, TriangleAlertIcon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatPrice } from "@/lib/money";
import { formatQuantity } from "@/lib/quantity";
import { useStockSummary } from "./queries";

const NO_VALUE = "—";

export function StockOverview() {
  const query = useStockSummary();
  const data = query.data;

  /** Valor do cartão: esqueleto carregando, travessão com erro. */
  function value(render: () => string) {
    if (query.isError) return NO_VALUE;
    return data ? render() : undefined;
  }

  return (
    <section
      aria-label="Indicadores do estoque"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
    >
      <StatCard
        label="Para repor"
        icon={TriangleAlertIcon}
        tone="warning"
        value={value(() => formatQuantity(data?.restock_count ?? 0))}
        hint="produtos abaixo do estoque mínimo"
      />
      <StatCard
        label="Sem estoque"
        icon={PackageXIcon}
        tone="danger"
        value={value(() => formatQuantity(data?.out_of_stock_count ?? 0))}
        hint="produtos com saldo zero"
      />
      <StatCard
        label="Valor em estoque"
        icon={BanknoteIcon}
        tone="tag"
        className="col-span-2 xl:col-span-1"
        value={value(() => formatPrice(data?.stock_value ?? "0.00"))}
        hint="saldo × preço de venda dos produtos ativos"
      />
    </section>
  );
}
