import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function isOnline(): boolean {
  return navigator.onLine;
}

/** Se o navegador está com internet, acompanhando os eventos `online` e `offline`. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isOnline);
}
