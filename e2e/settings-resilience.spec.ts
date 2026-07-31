import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Failure injection against the settings form.
 *
 * The point of these tests is the part a happy-path suite cannot cover: when
 * saving fails, the user must be told, and what they typed must survive. A form
 * that silently discards a failed save is worse than one that refuses outright,
 * because the user walks away believing the change took.
 *
 * Two things are needed before the form is reachable, and both are handled here
 * rather than in shared fixtures, so e2e/mock-supabase.mjs is untouched and the
 * other specs are unaffected.
 *
 * 1. A session. SettingsClient calls supabase.auth.getSession() and renders
 *    "Sign in to customize your profile" when it resolves empty. getSession()
 *    reads localStorage rather than the network, so seeding storage before page
 *    scripts run is enough — no auth endpoint needs mocking. supabase-js v2
 *    stores the session object directly under the key it derives from the
 *    configured URL (http://127.0.0.1:54321 -> sb-127-auth-token).
 *
 * 2. A successful initial load. fetchSettings() only calls setLoaded(true) when
 *    GET /api/settings responds ok, and the Save button is
 *    disabled={saving || !loaded}. Without stubbing that GET the button renders
 *    but never becomes clickable.
 */

const SUPABASE_STORAGE_KEY = "sb-127-auth-token";

const seedSupabaseSession = async (page: Page) => {
  const session = {
    access_token: "e2e-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "e2e-refresh-token",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      aud: "authenticated",
      role: "authenticated",
      email: "e2e-alice@example.com",
      app_metadata: { provider: "github", providers: ["github"] },
      user_metadata: { user_name: "e2e-alice", preferred_username: "e2e-alice" },
      created_at: "2024-01-01T00:00:00.000Z",
    },
  };

  // v2 stores the session directly. (v1 wrapped it as { currentSession, expiresAt };
  // writing that shape leaves getSession() resolving empty and the form unmounted.)
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [SUPABASE_STORAGE_KEY, JSON.stringify(session)],
  );
};

const EMPTY_SETTINGS = {
  headline: "",
  pinned_repos: [],
  custom_links: [],
  badges: [],
  visibility: "public",
  funding_links: [],
  sponsors: [],
};

/**
 * Installs a single handler for /api/settings.
 *
 * One handler covers both verbs deliberately: Playwright runs the most recently
 * registered matching route first, and route.continue() goes to the network
 * rather than to the next handler, so stacking two handlers would leave the GET
 * stub unreachable.
 */
const routeSettings = async (page: Page, onPut: (route: Route) => unknown) => {
  await page.route("**/api/settings", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_SETTINGS),
      });
    }
    if (route.request().method() === "PUT") {
      return onPut(route);
    }
    return route.continue();
  });
};

const HEADLINE = 'input[placeholder="Your custom tagline (replaces GitHub bio)"]';
const SAVE = 'button:has-text("Save Changes")';
const TYPED = "a tagline that must survive a failed save";

const openFormAndType = async (page: Page) => {
  await page.goto("/settings");
  await expect(page.locator(SAVE)).toBeEnabled();
  await page.fill(HEADLINE, TYPED);
};

test.describe("settings form under network failure", () => {
  test.beforeEach(async ({ page }) => {
    await seedSupabaseSession(page);
  });

  test("the session seed mounts the form and enables saving", async ({
    page,
  }) => {
    // Guards every test below. If the storage key or session shape stops
    // matching what supabase-js expects, the form never mounts and the
    // failure-injection tests would pass without exercising anything.
    await routeSettings(page, (route) => route.continue());

    await page.goto("/settings");
    await expect(
      page.getByText("Sign in to customize your profile"),
    ).toHaveCount(0);
    await expect(page.locator(SAVE)).toBeEnabled();
  });

  test("a 503 during save shows an error and keeps what was typed", async ({
    page,
  }) => {
    await routeSettings(page, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Service temporarily unavailable" }),
      }),
    );

    await openFormAndType(page);
    await page.click(SAVE);

    // The server's own message is surfaced rather than a generic one.
    await expect(
      page.getByText("Service temporarily unavailable"),
    ).toBeVisible();
    await expect(page.locator(HEADLINE)).toHaveValue(TYPED);
  });

  test("an aborted request shows an error and keeps what was typed", async ({
    page,
  }) => {
    // A connection that never answers rejects the fetch rather than resolving
    // it with a status — a different path through handleSave than the 503
    // above, and the one that previously showed nothing at all.
    await routeSettings(page, (route) => route.abort("connectionfailed"));

    await openFormAndType(page);
    await page.click(SAVE);

    await expect(
      page.getByText("Network error. Your changes were not saved."),
    ).toBeVisible();
    await expect(page.locator(HEADLINE)).toHaveValue(TYPED);
  });

  test("a malformed error body still produces a readable message", async ({
    page,
  }) => {
    // handleSave does resp.json().catch(() => ({})), so a non-JSON body must
    // fall through to the generic message rather than throwing.
    await routeSettings(page, (route) =>
      route.fulfill({
        status: 500,
        contentType: "text/html",
        body: "<html><body>proxy error</body></html>",
      }),
    );

    await openFormAndType(page);
    await page.click(SAVE);

    await expect(
      page.getByText("Failed to save. Please try again."),
    ).toBeVisible();
    await expect(page.locator(HEADLINE)).toHaveValue(TYPED);
  });

  test("the save button recovers after a failure", async ({ page }) => {
    await routeSettings(page, (route) => route.abort("connectionfailed"));

    await openFormAndType(page);
    await page.click(SAVE);

    await expect(
      page.getByText("Network error. Your changes were not saved."),
    ).toBeVisible();

    // `saving` is cleared in a finally block, so the button must be usable
    // again — otherwise one failure would strand the form for the session.
    await expect(page.locator(SAVE)).toBeEnabled();
  });
});
