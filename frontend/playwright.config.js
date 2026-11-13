import { defineConfig, devices } from "@playwright/test";

// O E2E roda contra a stack completa já no ar (frontend + API + PostgreSQL), sem
// mocks: `make e2e` sobe uma stack isolada e define E2E_BASE_URL.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
