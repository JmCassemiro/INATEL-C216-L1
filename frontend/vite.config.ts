import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/..." aponta para src/ (o mesmo alias do tsconfig.app.json)
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Testes de tela no jsdom são lentos com a máquina carregada (ex.: Docker no ar).
    testTimeout: 15_000,
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    // "npm run coverage": relatório no terminal e em HTML (coverage/index.html)
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // Componentes gerados pelo shadcn e declarações de tipo ficam de fora
      exclude: ["src/components/ui/**", "src/**/*.d.ts"],
      reporter: ["text", "html"],
    },
  },
});
