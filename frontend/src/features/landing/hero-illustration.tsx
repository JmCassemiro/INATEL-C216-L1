/**
 * Ilustração do hero: uma venda no caixa (a frente de caixa que vem nas próximas
 * versões) com cartões flutuando em volta. É uma imagem: leitores de tela ouvem
 * só a descrição, e os números são de exemplo. O cartão do caixa é sempre claro
 * (é um "print" do produto), por isso usa a paleta fixa do Tailwind, não os tokens.
 */
import {
  RefreshCwIcon,
  ScanBarcodeIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  WifiOffIcon,
} from "lucide-react";
import { PriceTag } from "@/features/products/price-tag";
import { ProductAvatar } from "@/features/products/product-avatar";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    id: "7",
    name: "Camiseta Básica Branca M",
    qty: "2 × R$ 49,90",
    total: "R$ 99,80",
  },
  {
    id: "3",
    name: "Calça Jeans Azul 42",
    qty: "1 × R$ 159,90",
    total: "R$ 159,90",
  },
  {
    id: "1",
    name: "Meia Cano Curto (par)",
    qty: "3 × R$ 12,50",
    total: "R$ 37,50",
  },
];

export function HeroIllustration() {
  return (
    <div
      role="img"
      aria-label="Ilustração: uma venda no caixa sem internet, com três itens pagos em Pix e cartão."
      className="relative mx-auto w-full max-w-[520px] pt-14 pb-12 sm:px-6 sm:pt-10"
    >
      <div className="relative rounded-3xl bg-white p-5 text-slate-800 shadow-xl ring-1 ring-white/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">
              CAIXA 02 · Turno de Ana
            </p>
            <p className="text-lg font-extrabold tracking-tight">
              Venda #1.284
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <WifiOffIcon className="size-3.5" />
            Offline · salvando local
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400 ring-1 ring-slate-200">
          <ScanBarcodeIcon className="size-4 text-indigo-600" />
          Bipe ou digite o código de barras…
        </div>

        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {ITEMS.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <ProductAvatar
                id={item.id}
                name={item.name}
                className="size-9 rounded-lg text-xs"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.name}</p>
                <p className="text-xs text-slate-400">{item.qty}</p>
              </div>
              <span className="font-bold tabular-nums">{item.total}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl bg-night p-4 text-white">
          <div>
            <p className="text-xs text-indigo-200">Total a receber</p>
            <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold">
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                Pix R$ 200,00
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                Cartão R$ 97,20
              </span>
            </div>
          </div>
          <PriceTag
            price="297.20"
            size="label"
            decorative
            className="rounded-md border-0 px-3 py-2 text-4xl"
          />
        </div>
      </div>

      <FloatingCard className="-top-1 left-0 animate-float sm:-left-6">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
          <RefreshCwIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">12 vendas sincronizadas</p>
          <p className="text-xs text-slate-400">a internet voltou há 3 s</p>
        </div>
      </FloatingCard>

      <FloatingCard className="top-24 -right-2 hidden animate-float-late sm:flex lg:-right-10">
        <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-500">
          <TriangleAlertIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">Estoque baixo</p>
          <p className="text-xs text-slate-400">Tênis Couro 41 · 3 un</p>
        </div>
      </FloatingCard>

      <div className="absolute bottom-0 left-2 flex animate-float-late items-center gap-3 rounded-2xl bg-brand-gradient px-4 py-3 text-white shadow-lg shadow-brand/40 sm:-left-4">
        <span className="grid size-10 place-items-center rounded-xl bg-white/15">
          <TrendingUpIcon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">Hoje: R$ 8.432,90</p>
          <p className="text-xs text-indigo-100">+18% que ontem</p>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-slate-800 shadow-lg backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
