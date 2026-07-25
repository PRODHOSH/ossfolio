import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * The suite deliberately runs with **no secrets at all**. That isn't a shortcut — it's the
 * only way it can be useful here. GitHub Actions does not expose repository secrets to pull
 * requests from forks, and this project is built almost entirely on fork contributions. A
 * suite that needed a real Supabase URL would go green for the maintainer and red for every
 * outside contributor, which is worse than having no suite at all.
 *
 * So `e2e/mock-supabase.mjs` stands in for the database. supabase-js is just an HTTP client
 * against PostgREST, so pointing `NEXT_PUBLIC_SUPABASE_URL` at a local fixture server gives
 * the server components deterministic data — no secrets, no network, and no GitHub, which is
 * also what the issue asks for ("do not test real GitHub OAuth in CI; mock the
 * authentication state").
 *
 * `NEXT_PUBLIC_*` values are inlined by Next at build time, not read at runtime, which is why
 * the app is built here with the mock's URL already set rather than having it injected later.
 */
export default defineConfig({
  testDir: "./e2e",
  // Fail the build rather than quietly skip, if someone leaves a `test.only` behind.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker on CI: the suite shares a single app server and a single fixture server, so
  // parallel workers would be racing over the same state for no real gain at this size.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      port: 54321,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
    },
    {
      command: "npm run build && npm run start",
      port: 3000,
      // A cold Next build is slow; the default 60s is not enough on a CI runner.
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        // Not real credentials, and not secret — the fixture server ignores them entirely.
        // They exist only because the client refuses to construct without a key.
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
      },
    },
  ],
});
