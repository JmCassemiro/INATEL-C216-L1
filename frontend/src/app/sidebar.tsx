/**
 * Conteúdo do menu lateral: marca, seções e o cartão de conexão. O mesmo conteúdo
 * aparece fixo no desktop e numa gaveta no celular e no tablet (DESIGN.md, Layout).
 */
import {
  BoxesIcon,
  type LucideIcon,
  PackageIcon,
  ScanBarcodeIcon,
  ShoppingCartIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import { BrandMark } from "@/components/brand/brand-mark";
import { useCatalogFirstPage } from "@/features/products/queries";
import { useStockSummary } from "@/features/stock/queries";
import { useOnlineStatus } from "@/lib/use-online-status";
import { cn } from "@/lib/utils";

const ITEM =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6">
        <Link
          to="/products"
          onClick={onNavigate}
          className="inline-flex rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-price-tag/60"
        >
          <BrandMark tone="night" />
        </Link>
      </div>

      <nav aria-label="Seções" className="flex flex-col gap-1 px-3">
        <p className="type-eyebrow px-3 pb-2 text-sidebar-muted">
          Frente de caixa
        </p>
        <SectionLink
          to="/sales/new"
          label="Nova venda"
          icon={ScanBarcodeIcon}
          onNavigate={onNavigate}
        />
        <p className="type-eyebrow px-3 pt-4 pb-2 text-sidebar-muted">
          Retaguarda
        </p>
        <ProductsLink onNavigate={onNavigate} />
        <StockLink onNavigate={onNavigate} />
        <SectionLink
          to="/sales"
          end
          label="Vendas"
          icon={ShoppingCartIcon}
          onNavigate={onNavigate}
        />
      </nav>

      <ConnectionCard />
    </div>
  );
}

function ProductsLink({ onNavigate }: { onNavigate?: () => void }) {
  const total = useCatalogFirstPage().data?.total;
  return (
    <SectionLink
      to="/products"
      label="Produtos"
      icon={PackageIcon}
      onNavigate={onNavigate}
      badge={
        total !== undefined && (
          // A contagem repete a da página; para o leitor de tela, o link é só "Produtos".
          <span
            aria-hidden="true"
            className="ml-auto rounded-full bg-price-tag px-2 py-0.5 text-[11px] font-bold tabular-nums text-price-tag-foreground"
          >
            {total}
          </span>
        )
      }
    />
  );
}

/** Estoque, com o número de produtos para repor quando há algum (spec 011, FR-026). */
function StockLink({ onNavigate }: { onNavigate?: () => void }) {
  const restock = useStockSummary().data?.restock_count ?? 0;
  return (
    <SectionLink
      to="/stock"
      label="Estoque"
      icon={BoxesIcon}
      onNavigate={onNavigate}
      badge={
        restock > 0 && (
          // O número repete o da seção; para o leitor de tela, o link é só "Estoque".
          <span
            aria-hidden="true"
            className="ml-auto rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
          >
            {restock}
          </span>
        )
      }
    />
  );
}

/** Link de uma seção do painel; a seção atual fica destacada (`aria-current`). */
function SectionLink({
  to,
  end,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: {
  to: string;
  /** Só fica ativo no endereço exato (`/sales` não acende em `/sales/new`). */
  end?: boolean;
  label: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={cn(
        ITEM,
        "group hover:bg-sidebar-accent hover:text-night-foreground focus-visible:ring-3 focus-visible:ring-price-tag/60",
        "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-night-foreground aria-[current=page]:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
      )}
    >
      <Icon
        className="size-[18px] group-aria-[current=page]:text-price-tag"
        aria-hidden="true"
      />
      {label}
      {badge}
    </NavLink>
  );
}

/**
 * Estado real da conexão do navegador. O painel ainda não funciona sem internet, então
 * avisa que as alterações não serão salvas até a conexão voltar.
 */
function ConnectionCard() {
  const online = useOnlineStatus();
  const Icon = online ? WifiIcon : WifiOffIcon;
  return (
    <div
      role="status"
      aria-label="Conexão"
      className={cn(
        "mx-3 mt-auto mb-4 rounded-2xl p-4 text-white shadow-lg",
        online ? "bg-brand-gradient shadow-brand/30" : "bg-destructive",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4" aria-hidden="true" />
        {online ? "Conectado" : "Sem internet"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/80">
        {online
          ? "O catálogo vem direto do servidor. Tudo que muda aqui vale na hora."
          : "As alterações não serão salvas até a conexão voltar."}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            online ? "w-full bg-price-tag" : "w-1/4 bg-white/70",
          )}
        />
      </div>
    </div>
  );
}
