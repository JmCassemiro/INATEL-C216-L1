import { useSyncExternalStore } from "react";

/** Abaixo de 640 px a lista vira empilhada (DESIGN.md, Responsivo). */
const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isMobile(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobile);
}
