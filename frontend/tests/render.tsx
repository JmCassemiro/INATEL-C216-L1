/**
 * Renderiza a aplicação real (providers, rotas e telas) num roteador em memória.
 * Só o servidor é simulado (MSW); o resto é o mesmo código que roda no navegador.
 */
import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { AppProviders } from "@/app/app";
import { routes } from "@/app/router";

export function renderApp(route = "/products") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  // Sem pausa entre as teclas: o comportamento é o mesmo, e os testes ficam mais rápidos.
  const user = userEvent.setup({ delay: null });
  const view = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { user, router, queryClient, ...view };
}

/** Endereço atual do roteador em memória (caminho + busca), para conferir a URL. */
export function currentUrl(
  router: ReturnType<typeof createMemoryRouter>,
): string {
  const { pathname, search } = router.state.location;
  return pathname + search;
}
