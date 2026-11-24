/**
 * Indicadores do catálogo: só dados reais da API. O total vem da contagem do
 * servidor; preço médio e faixa de preços olham os cadastros mais recentes (a
 * primeira página), e o rótulo diz isso. Estoque depende da próxima spec: "em breve".
 */
import { BoxesIcon, PackageCheckIcon, ScaleIcon, TagIcon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { averagePrice, formatPrice, priceRange } from "@/lib/money";
import { useCatalogFirstPage } from "./queries";

const NO_VALUE = "—";

export function CatalogOverview() {
  const query = useCatalogFirstPage();
  const data = query.data;
  const prices = data?.items.map((product) => product.price) ?? [];
  const average = averagePrice(prices);
  const range = priceRange(prices);

  /** Valor do cartão: esqueleto carregando, travessão com erro ou sem produtos. */
  function value<T>(
    ready: T | null | undefined,
    render: (v: NonNullable<T>) => string,
  ) {
    if (query.isError) return NO_VALUE;
    if (!data) return undefined;
    return ready == null ? NO_VALUE : render(ready);
  }

  const sample =
    data && data.total > prices.length
      ? `nos ${prices.length} cadastros mais recentes`
      : "de todo o catálogo";

  return (
    <section
      aria-label="Indicadores do catálogo"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
    >
      <StatCard
        label="Produtos no catálogo"
        icon={PackageCheckIcon}
        value={value(data?.total, String)}
        hint="cadastrados e prontos para vender"
      />
      <StatCard
        label="Preço médio"
        icon={TagIcon}
        tone="tag"
        value={value(average, formatPrice)}
        hint={average ? sample : undefined}
      />
      <StatCard
        label="Menor e maior preço"
        icon={ScaleIcon}
        tone="success"
        value={
          range && data && !query.isError ? (
            <span className="flex flex-wrap items-baseline gap-x-2">
              {formatPrice(range.min)}
              <span className="text-base font-semibold text-muted-foreground">
                a {formatPrice(range.max)}
              </span>
            </span>
          ) : (
            value(range, (r) => formatPrice(r.min))
          )
        }
        hint={range ? sample : undefined}
      />
      <StatCard
        label="Estoque"
        icon={BoxesIcon}
        tone="muted"
        value={
          <span className="inline-flex rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
            em breve
          </span>
        }
        hint="Quantidade, mínimo e alerta de reposição na próxima versão."
      />
    </section>
  );
}
