import { Link, NavLink, Outlet } from "react-router";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Margens do conteúdo (DESIGN.md): 16 px no celular, 24 px no tablet, 32 px no desktop. */
const CONTAINER = "mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8";

/**
 * Barra superior com a marca, as seções e a troca de tema. Sem menu lateral: com
 * uma seção só, ele seria uma coluna vazia (DESIGN.md, Layout). As próximas specs
 * acrescentam seções na navegação.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-card">
        <div className={`${CONTAINER} flex h-14 items-center gap-6`}>
          <Link
            to="/products"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandMark />
          </Link>
          <nav aria-label="Seções" className="flex h-full items-stretch">
            <NavLink
              to="/products"
              className="relative inline-flex items-center px-1 text-sm font-medium text-muted-foreground outline-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-foreground aria-[current=page]:after:bg-primary"
            >
              Produtos
            </NavLink>
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`${CONTAINER} flex-1 py-6 sm:py-8`}>
        <Outlet />
      </main>
    </div>
  );
}
