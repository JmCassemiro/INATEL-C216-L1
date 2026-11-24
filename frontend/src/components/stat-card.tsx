import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TONES = {
  brand: "bg-accent text-primary",
  tag: "bg-price-tag/25 text-warning",
  success: "bg-success/10 text-success",
  muted: "bg-muted text-muted-foreground",
} as const;

type StatCardProps = {
  label: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  /** `undefined` enquanto carrega (mostra o esqueleto). */
  value: ReactNode | undefined;
  hint?: ReactNode;
  className?: string;
};

/**
 * Indicador em cartão (DESIGN.md, Indicadores): rótulo, ícone num chip colorido,
 * valor grande e uma dica. É um `group` com o rótulo como nome acessível.
 */
export function StatCard({
  label,
  icon: Icon,
  tone = "brand",
  value,
  hint,
  className,
}: StatCardProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: `fieldset` é para campos de formulário; aqui é só um agrupamento rotulado.
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm sm:p-5 ring-1 ring-border transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            TONES[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-9 w-28" />
      ) : (
        <div className="type-kpi">{value}</div>
      )}
      {hint && <div className="type-meta text-muted-foreground">{hint}</div>}
    </div>
  );
}
