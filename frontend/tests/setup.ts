import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { installBrowserPolyfills, resetMediaMatches } from "./browser";
import { catalog } from "./msw/catalog";
import { server } from "./msw/server";

installBrowserPolyfills();

// Requisição sem rota simulada é erro: o teste não pode depender de rede de verdade.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

beforeEach(() => {
  catalog.reset();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMediaMatches();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterAll(() => server.close());
