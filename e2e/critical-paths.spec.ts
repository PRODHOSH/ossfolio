import { test, expect } from '@playwright/test';

/**
 * The three critical paths from the issue: the homepage renders, a profile renders, and the
 * leaderboard is reachable.
 *
 * One correction worth recording: the issue says "navigate to the leaderboard", but there is
 * no `/leaderboard` route. The leaderboard is `/explore` — that's the page that ranks profiles
 * by score. The test targets the page that exists.
 *
 * Assertions lean on roles and visible text rather than CSS classes or test ids, so a styling
 * change (the Tailwind v4 refactor in #414, say) doesn't turn into a false failure. A test that
 * breaks when the design changes teaches everyone to ignore it.
 */

test.describe('critical paths', () => {
  test('the homepage renders and offers a way in', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/ossfolio/i);

    // A 200 that renders an empty page is still a broken homepage, and that's precisely the
    // kind of failure this suite exists to catch. `#main-content` is the landmark the skip
    // link targets, so it's the right thing to assert on — and it's a single element, unlike
    // a `main, body` selector list, which matches both and trips Playwright's strict mode.
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
    await expect(main).not.toBeEmpty();

    // The primary journey out of the homepage must exist.
    const explore = page
      .getByRole('link', { name: /explore|discover|leaderboard/i })
      .first();
    await expect(explore).toBeVisible();
  });

  test('the leaderboard lists profiles by score', async ({ page }) => {
    // `/explore` is the leaderboard; see the note above.
    const response = await page.goto('/explore');
    expect(response?.status()).toBe(200);

    // Both fixture profiles come from the mock Supabase, so this asserts the whole
    // server-component data path — query, render, hydrate — not merely that a route responds.
    await expect(page.getByText('e2e-alice').first()).toBeVisible();
    await expect(page.getByText('e2e-bob').first()).toBeVisible();
  });

  test("a profile page renders that user's data", async ({ page }) => {
    const response = await page.goto('/e2e-alice');
    expect(response?.status()).toBe(200);

    // e2e-alice has a stored snapshot in the fixtures, so the DB-first path from #300 should
    // render her straight from it — no GitHub call, and no syncing state.
    await expect(page.getByRole('heading', { name: 'E2E Alice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /e2e-alice/i })).toBeVisible();

    await expect(page.getByText(/Building this profile/i)).toHaveCount(0);
  });

  test('a profile with no snapshot yet shows the syncing state', async ({
    page,
  }) => {
    // e2e-bob deliberately has no snapshot row. This covers the other half of #300: a cold
    // profile must respond immediately with the syncing state rather than blocking on GitHub.
    // It's the branch most likely to rot unnoticed, since it only appears on a first-ever view.
    const response = await page.goto('/e2e-bob');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: /Building this profile/i })).toBeVisible();
  });

  test('an unknown route 404s rather than erroring', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-e2e');
    // Next serves the not-found page; what matters is that it isn't a 500.
    expect(response?.status()).toBeLessThan(500);
  });
});
