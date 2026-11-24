/**
 * Página de entrada do NexoPDV (DESIGN.md, Layout do site). Apresenta o produto e
 * leva ao painel. O que ainda não existe aparece como "Em breve": nenhuma ação
 * leva a uma tela que não existe (não há "Entrar" enquanto não houver login).
 */
import {
  ArrowRightIcon,
  BoxesIcon,
  CloudUploadIcon,
  HardDriveIcon,
  type LucideIcon,
  NotebookPenIcon,
  PackageCheckIcon,
  ReceiptIcon,
  ScanBarcodeIcon,
  ShoppingCartIcon,
  TagIcon,
  WifiOffIcon,
} from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";
import { HeroIllustration } from "./hero-illustration";

const CHIPS: { label: string; icon: LucideIcon }[] = [
  { label: "Vende offline", icon: WifiOffIcon },
  { label: "Leitor de código", icon: ScanBarcodeIcon },
  { label: "Estoque com alerta", icon: BoxesIcon },
  { label: "Crediário (fiado)", icon: NotebookPenIcon },
  { label: "Pix e cartão", icon: ReceiptIcon },
];

const STATS = [
  { value: "0", label: "vendas perdidas quando a internet cai" },
  { value: "4", label: "padrões de código de barras validados" },
  { value: "Pix, cartão e fiado", label: "na mesma venda" },
  { value: "Web + balcão", label: "painel no navegador, caixa na loja" },
];

type Feature = {
  title: string;
  text: string;
  icon: LucideIcon;
  available: boolean;
  tone: string;
};

const FEATURES: Feature[] = [
  {
    title: "Catálogo de produtos",
    text: "Cadastro com validação do código de barras, busca sem se preocupar com acentos e edição em segundos.",
    icon: PackageCheckIcon,
    available: true,
    tone: "from-indigo-500 to-violet-600",
  },
  {
    title: "Etiqueta de gôndola",
    text: "Veja a etiqueta com as barras de verdade (EAN-13, EAN-8 e UPC-A) enquanto digita o preço.",
    icon: TagIcon,
    available: true,
    tone: "from-amber-400 to-orange-500",
  },
  {
    title: "Frente de caixa",
    text: "Venda pelo leitor de código, com vários meios de pagamento e troco calculado na hora.",
    icon: ShoppingCartIcon,
    available: true,
    tone: "from-sky-400 to-indigo-500",
  },
  {
    title: "Estoque com alerta",
    text: "Entradas e ajustes com motivo, histórico de movimentos e aviso quando um item fica abaixo do mínimo.",
    icon: BoxesIcon,
    available: true,
    tone: "from-emerald-400 to-teal-600",
  },
  {
    title: "Crediário (fiado)",
    text: "A conta de cada cliente, com limite, pagamentos parciais e o histórico do que foi levado.",
    icon: NotebookPenIcon,
    available: false,
    tone: "from-pink-400 to-rose-500",
  },
  {
    title: "Funciona sem internet",
    text: "O caixa continua vendendo quando a conexão cai e envia tudo sozinho quando ela volta.",
    icon: WifiOffIcon,
    available: false,
    tone: "from-slate-500 to-slate-800",
  },
];

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Vende no balcão",
    text: "Cada venda é gravada primeiro no próprio caixa. Sem internet, nada para.",
    icon: ScanBarcodeIcon,
  },
  {
    title: "Guarda numa fila",
    text: "As vendas feitas sem conexão esperam numa fila local, na ordem em que aconteceram.",
    icon: HardDriveIcon,
  },
  {
    title: "Sincroniza sozinho",
    text: "Quando a internet volta, a fila sobe para o servidor e o painel mostra tudo atualizado.",
    icon: CloudUploadIcon,
  },
];

/** Botão-link amarelo da ação principal (mesmo visual do `Button` `highlight`). */
function PanelLink({ className }: { className?: string }) {
  return (
    <Link
      to="/products"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-price-tag font-bold text-price-tag-foreground shadow-glow-tag outline-none transition hover:brightness-105 focus-visible:ring-4 focus-visible:ring-price-tag/50",
        className,
      )}
    >
      Abrir o painel
      <ArrowRightIcon className="size-4" aria-hidden="true" />
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <title>NexoPDV · Frente de caixa offline-first para o varejo</title>

      <header className="relative isolate overflow-hidden bg-hero-glow text-night-foreground">
        <div className="bg-grid-faint absolute inset-0 -z-10" />
        <nav
          aria-label="Site"
          className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-5 sm:px-8"
        >
          <Link
            to="/"
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-price-tag/60"
          >
            <BrandMark tone="night" />
          </Link>
          <div className="hidden gap-7 text-sm font-medium text-night-muted md:flex">
            <a href="#recursos" className="transition hover:text-white">
              Recursos
            </a>
            <a href="#offline" className="transition hover:text-white">
              Como funciona
            </a>
          </div>
          <PanelLink className="ml-auto h-10 px-5 text-sm" />
        </nav>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-8 pb-28 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14 lg:pb-36">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-night-muted ring-1 ring-white/15">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400" />
              Frente de caixa offline-first para o varejo
            </span>
            <h1 className="type-display mt-6">
              O caixa da sua loja{" "}
              <span className="text-tag-gradient">não para</span>. Nem quando a
              internet cai.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-night-muted">
              Venda pelo código de barras, receba em Pix, cartão ou no fiado, e
              acompanhe catálogo, estoque e faturamento de qualquer lugar.
              Quando a conexão volta, tudo sincroniza sozinho.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PanelLink className="h-13 px-7 text-base" />
              <a
                href="#offline"
                className="inline-flex h-13 items-center gap-2 rounded-full px-6 font-semibold ring-1 ring-white/30 transition hover:bg-white/10"
              >
                Como funciona o offline
              </a>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2.5 text-sm font-semibold">
              {CHIPS.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-2 ring-1 ring-white/15"
                >
                  <Icon className="size-4 text-price-tag" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <HeroIllustration />
        </div>
      </header>

      <main>
        <section aria-label="Números" className="relative -mt-14 px-4 sm:px-8">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 rounded-3xl bg-card p-6 shadow-md ring-1 ring-border sm:p-8 lg:grid-cols-4 lg:divide-x">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse justify-end px-3 sm:px-6"
              >
                <dt className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          id="recursos"
          aria-labelledby="recursos-title"
          className="mx-auto max-w-7xl scroll-mt-8 px-4 py-20 sm:px-8 lg:py-28"
        >
          <p className="type-eyebrow text-primary">Recursos</p>
          <h2
            id="recursos-title"
            className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Tudo o que o balcão precisa, num sistema só.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            O NexoPDV cresce por partes. O catálogo, o estoque e a frente de
            caixa já estão no ar; o crediário e a venda sem internet chegam nas
            próximas versões.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section
          id="offline"
          aria-label="Como o caixa funciona sem internet"
          className="scroll-mt-8 px-4 sm:px-8"
        >
          <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl bg-night-glow px-6 py-14 text-night-foreground sm:px-12 lg:py-20">
            <div className="bg-grid-faint absolute inset-0 -z-10 opacity-70" />
            <p className="type-eyebrow text-price-tag">Offline-first</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              A internet caiu? O cliente nem percebe.
            </h2>
            <ol className="mt-12 grid gap-6 lg:grid-cols-3">
              {STEPS.map(({ title, text, icon: Icon }, index) => (
                <li
                  key={title}
                  className="relative rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand-gradient shadow-glow-brand">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="type-eyebrow text-night-muted">
                      Passo {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-night-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-card p-8 shadow-md ring-1 ring-border sm:p-12 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                Seu catálogo já pode morar aqui.
              </h2>
              <p className="mt-3 max-w-xl text-lg text-muted-foreground">
                Cadastre os produtos, confira as etiquetas e deixe tudo pronto
                para o dia em que o caixa chegar.
              </p>
            </div>
            <PanelLink className="h-13 shrink-0 px-7 text-base" />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-8">
          <BrandMark />
          <p>NexoPDV · projeto acadêmico de sistemas distribuídos.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, text, icon: Icon, available, tone }: Feature) {
  return (
    <article className="group flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-12 place-items-center rounded-xl bg-linear-to-br text-white shadow-md",
            tone,
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            available
              ? "bg-success/10 text-success ring-1 ring-success/20"
              : "bg-muted text-muted-foreground",
          )}
        >
          {available ? "Disponível" : "Em breve"}
        </span>
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-muted-foreground">{text}</p>
    </article>
  );
}
