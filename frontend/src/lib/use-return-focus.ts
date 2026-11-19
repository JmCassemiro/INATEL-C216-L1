import { useCallback, useRef } from "react";

/**
 * Devolve o foco a quem abriu o painel ou o diálogo (FR-021). O Radix só faz isso
 * sozinho quando a abertura é por um `Trigger` dele; aqui a abertura é pelo estado
 * da página (botão "Novo produto", ações de cada linha).
 *
 * Uso: `<SheetContent {...useReturnFocus()}>`.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);

  // Chamado antes de o foco entrar no conteúdo: o elemento ativo ainda é quem abriu.
  const onOpenAutoFocus = useCallback(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    if (opener.current?.isConnected) {
      event.preventDefault();
      opener.current.focus();
    }
  }, []);

  return { onOpenAutoFocus, onCloseAutoFocus };
}
