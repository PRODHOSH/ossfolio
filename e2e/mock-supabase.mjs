/**
 * A stand-in for Supabase, for end-to-end tests.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 *
 * The pages worth testing — the leaderboard on `/explore`, a profile on `/[username]` —
 * are React Server Components. They query Supabase on the *server*, before any HTML
 * reaches the browser, so Playwright's `page.route()` can't intercept them: by the time
 * the browser sees anything, the query has already happened.
 *
 * The other obvious answer, pointing CI at a real Supabase project, doesn't work either —
 * and not for the reason you'd guess. GitHub Actions **does not expose secrets to pull
 * requests from forks**. This repository is built on fork contributions, so a suite that
 * needed `SUPABASE_URL` would fail on every external contributor's PR while passing on
 * the maintainer's. A test suite that only runs for some people is worse than none.
 *
 * So: supabase-js is just an HTTP client. It issues plain PostgREST requests to
 * `${SUPABASE_URL}/rest/v1/<table>?<filters>`. Point it at this server instead and the
 * server components get deterministic fixtures — no secrets, no network, no GitHub, and
 * identical behaviour for maintainers and first-time contributors alike.
 *
 * This also satisfies the issue's "do not test real GitHub OAuth in CI; mock the
 * authentication state": nothing here talks to GitHub or to a real auth provider.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);

/** Two profiles, so the leaderboard has something to rank. */
const PROFILES = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    username: "e2e-alice",
    name: "E2E Alice",
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    github_url: "https://github.com/e2e-alice",
    score: 1240,
    total_commits: 820,
    total_prs: 143,
    total_issues: 61,
    total_reviews: 77,
    followers: 210,
    top_languages: ["TypeScript", "Go"],
    badges: [],
    headline: "Alice builds things",
    pinned_repos: [],
    custom_links: [],
    visibility: "public",
    flagged: false,
    flag_reason: null,
    score_delta_30_days: 40,
    view_count: 12,
    updated_at: "2026-07-01T00:00:00.000Z",
    last_refreshed_at: "2026-07-01T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    bio: null,
    search_text: "e2e-alice",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    username: "e2e-bob",
    name: "E2E Bob",
    avatar_url: "https://avatars.githubusercontent.com/u/2?v=4",
    github_url: "https://github.com/e2e-bob",
    score: 610,
    total_commits: 300,
    total_prs: 44,
    total_issues: 12,
    total_reviews: 9,
    followers: 30,
    top_languages: ["Python"],
    badges: [],
    headline: null,
    pinned_repos: [],
    custom_links: [],
    visibility: "public",
    flagged: false,
    flag_reason: null,
    score_delta_30_days: 5,
    view_count: 3,
    updated_at: "2026-06-01T00:00:00.000Z",
    last_refreshed_at: "2026-06-01T00:00:00.000Z",
    created_at: "2025-03-01T00:00:00.000Z",
    bio: null,
    search_text: "e2e-bob",
  },
];

/**
 * A snapshot for `e2e-alice`, so her profile renders fully rather than falling into the
 * "Building this profile" state. `e2e-bob` deliberately has none — that's how the syncing
 * path gets covered too.
 */
const SNAPSHOTS = [
  {
    username: "e2e-alice",
    synced_at: new Date().toISOString(),
    sync_started_at: new Date().toISOString(),
    snapshot: {
      user: {
        login: "e2e-alice",
        name: "E2E Alice",
        bio: "Alice builds things",
        avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
        html_url: "https://github.com/e2e-alice",
        public_repos: 24,
        followers: 210,
        following: 12,
        blog: null,
        location: "Testville",
        twitter_username: null,
      },
      repos: [
        {
          id: 1,
          name: "alice-cli",
          description: "A command line tool",
          html_url: "https://github.com/e2e-alice/alice-cli",
          stargazers_count: 412,
          forks_count: 33,
          language: "TypeScript",
          topics: ["cli"],
          pushed_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      liveStats: {
        totalCommits: 820,
        totalPRs: 143,
        totalIssues: 61,
        totalReviews: 77,
        totalContributions: 1101,
      },
      mergedPRs: [],
      orgs: [],
      contributionCalendar: null,
      rateLimited: false,
    },
  },
];

/** Pull the value out of a PostgREST filter such as `username=eq.e2e-alice`. */
function eqValue(params, column) {
  const raw = params.get(column);
  if (!raw) return null;
  return raw.startsWith("eq.") ? decodeURIComponent(raw.slice(3)) : null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // supabase-js asks for a single object (rather than an array) via this header.
  const wantsSingle = (req.headers["accept"] ?? "").includes(
    "vnd.pgrst.object",
  );

  const respond = (rows) => {
    if (wantsSingle) {
      // `.maybeSingle()` expects one object, or 406 when there's nothing.
      if (rows.length === 0) {
        res.statusCode = 406;
        res.end(JSON.stringify({ message: "no rows" }));
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify(rows[0]));
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(rows));
  };

  if (url.pathname.startsWith("/rest/v1/profiles")) {
    const username = eqValue(url.searchParams, "username");
    const id = eqValue(url.searchParams, "id");
    let rows = PROFILES;
    if (username) rows = rows.filter((p) => p.username === username);
    if (id) rows = rows.filter((p) => p.id === id);
    respond(rows);
    return;
  }

  if (url.pathname.startsWith("/rest/v1/profile_snapshots")) {
    const username = eqValue(url.searchParams, "username");
    const rows = username
      ? SNAPSHOTS.filter((s) => s.username === username)
      : SNAPSHOTS;
    respond(rows);
    return;
  }

  // Anything we haven't taught it about answers with an empty set rather than a 404, so an
  // unmocked query degrades to "no data" instead of failing the render outright.
  respond([]);
});

server.listen(PORT, "127.0.0.1", () => {
  // Playwright's `webServer` waits for this port, so the message is only for humans.
  console.log(`[mock-supabase] listening on http://127.0.0.1:${PORT}`);
});
