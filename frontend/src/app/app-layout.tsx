import { GlobeIcon, MenuIcon } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useMatches } from "react-router";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

/** Título da seção atual, vindo do `handle` da rota (router.tsx). */
function useSectionTitle(): string | undefined {
  const matches = useMatches();
  const handle = matches.at(-1)?.handle as { title?: string } | undefined;
  return handle?.title;
}

/**
 * Casca do painel (DESIGN.md, Layout): menu lateral noturno fixo a partir de 1024 px;
 * abaixo disso, o mesmo menu abre numa gaveta pelo botão da barra superior.
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const section = useSectionTitle();

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">
        <div className="sticky top-0 h-svh">
          <Sidebar />
        </div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 border-0 bg-sidebar p-0 data-[side=left]:w-72 [&>[data-slot=sheet-close]]:top-6 [&>[data-slot=sheet-close]]:text-sidebar-foreground [&>[data-slot=sheet-close]]:hover:bg-sidebar-accent [&>[data-slot=sheet-close]]:hover:text-night-foreground"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Seções do painel do NexoPDV.
          </SheetDescription>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </Button>
          <p className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Painel</span>
            {section && (
              <>
                <span aria-hidden="true" className="text-muted-foreground/60">
                  /
                </span>
                <span className="font-semibold">{section}</span>
              </>
            )}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link to="/">
                <GlobeIcon data-icon="inline-start" />
                Ver o site
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
