/**
 * O que o jsdom não implementa e a aplicação (ou o Radix) usa. Cada teste começa
 * numa tela de desktop, com o sistema em tema claro; quem precisa de outra coisa
 * chama `setMediaMatches` antes de renderizar.
 */

const mediaMatches = new Map<string, boolean>();

export function setMediaMatches(query: string, matches: boolean): void {
  mediaMatches.set(query, matches);
}

export function resetMediaMatches(): void {
  mediaMatches.clear();
}

function fakeMediaQueryList(query: string): MediaQueryList {
  return {
    matches: mediaMatches.get(query) ?? false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
}

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

export function installBrowserPolyfills(): void {
  window.matchMedia = fakeMediaQueryList;
  globalThis.ResizeObserver ??= FakeResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
