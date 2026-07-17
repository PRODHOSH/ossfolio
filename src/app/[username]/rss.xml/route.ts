import { after } from "next/server";
import { getProfileByUsername } from "@/lib/db";
import { sanitizeUsername } from "@/lib/validators/api";
import { getProfileSnapshot, syncProfileSnapshot } from "@/lib/profile-snapshot";
import type { MergedPR } from "@/types";

export const runtime = "edge";

/** Matches sitemap.ts, which is the only other place that needs an absolute URL. */
const SITE_URL = "https://ossfolio.qzz.io";

/** Feed readers show a handful of recent items; there's no value in syndicating the whole history. */
const MAX_ITEMS = 20;

/**
 * The load-bearing function in this file.
 *
 * An unescaped `&` or `<` does not make a feed reader skip one item — it makes the whole document
 * fail to parse, and the reader drops the entire feed. And PR titles contain both constantly:
 * "fix: handle a < b", "chore: bump foo & bar", `feat: add <Tooltip>`. So this is the difference
 * between a feed that works and a feed that silently never works for anybody.
 *
 * The control-character strip matters for the same reason: XML 1.0 forbids most of them outright
 * (there is no escape sequence that makes them legal), so they have to be removed rather than
 * encoded. They shouldn't appear in a GitHub PR title, but "shouldn't" is doing a lot of work in a
 * string that arrives from an external API and goes straight into a document that fails closed.
 */
function escapeXml(value: string): string {
  return (
    value
      // Illegal in XML 1.0 regardless of escaping — tab, LF and CR are the only ones permitted.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      // `&` first, or it re-escapes the ampersands introduced by the replacements below.
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

/**
 * RSS 2.0 requires RFC 822 dates, not ISO 8601 — `2026-07-13T10:00:00Z` is not a valid `pubDate`
 * and strict readers reject it. `toUTCString()` produces the RFC 822 form.
 *
 * `mergedAt` comes from the GitHub API rather than from us, so an unparseable value is treated as
 * missing rather than being allowed to emit the string "Invalid Date" into the XML.
 */
function toRfc822(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toUTCString();
}

function buildItem(pr: MergedPR): string {
  const title = escapeXml(
    pr.repoName ? `${pr.repoName}: ${pr.title}` : pr.title
  );
  const link = escapeXml(pr.url);
  const pubDate = toRfc822(pr.mergedAt);

  // `isPermaLink="true"` is honest here: the guid *is* the PR's URL, and it's stable and
  // dereferenceable. Readers use it to decide what they've already shown, so it has to be stable
  // across rebuilds — which the PR URL is and a generated id would not be.
  return [
    "    <item>",
    `      <title>${title}</title>`,
    `      <link>${link}</link>`,
    `      <guid isPermaLink="true">${link}</guid>`,
    pubDate ? `      <pubDate>${escapeXml(pubDate)}</pubDate>` : null,
    `      <description>${escapeXml(
      `Merged pull request in ${pr.repoName || "a repository"}: ${pr.title}`
    )}</description>`,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = sanitizeUsername(rawUsername);

  if (!username) {
    return new Response("Not found", { status: 404 });
  }

  // A private profile has no page, so it must not have a syndicated feed either — a feed is simply
  // another read path, and it would hand out precisely what the setting exists to withhold.
  //
  // `unlisted` is deliberately still served. It means "don't list me", not "don't exist": the
  // profile page itself still renders for anyone holding the link, and the feed follows the page
  // rather than inventing a stricter rule of its own.
  const { data: profileRow, error: visibilityError } = await getProfileByUsername(
        username,
        "visibility",
      );

  // Fail closed. The Supabase client resolves with `{ data: null, error }` rather than throwing, so
  // discarding the error would leave `profileRow` null on any database failure — the private check
  // below would pass, and the feed would be served. That is precisely the content the setting exists
  // to withhold, handed out because a query happened to fail.
  //
  // 503 rather than 404, for the same reason as the cold-profile branch: a 404 tells a reader the
  // feed is dead and it should unsubscribe. A transient database blip is not that.
  if (visibilityError) {
    return new Response("Temporarily unavailable", {
      status: 503,
      headers: {
        "Retry-After": "60",
        "Cache-Control": "no-store",
      },
    });
  }

  if (profileRow?.visibility === "private") {
    return new Response("Not found", { status: 404 });
  }

  // The same snapshot the profile page renders from, so the feed can never disagree with the page,
  // and no GitHub call is made on this path.
  const stored = await getProfileSnapshot(username);

  // Cold profile: nothing stored yet. The page handles this by kicking the sync off behind the
  // response and showing a syncing state rather than 404ing, and the feed follows it — a feed that
  // never triggers the sync that would populate it would 404 forever.
  //
  // 503 rather than 404 on purpose. To a feed reader a 404 means "this feed is dead, unsubscribe",
  // which is exactly the wrong instruction for a profile that is about to have content. 503 with
  // Retry-After means "come back shortly", which is the truth.
  //
  // `after()` runs once this response has already been sent, so the caller waits for nothing, and
  // the claim inside syncProfileSnapshot() stops a polling reader from stampeding GitHub.
  if (!stored?.snapshot) {
    after(() => syncProfileSnapshot(username));

    return new Response("Profile has not been synced yet. Try again shortly.", {
      status: 503,
      headers: {
        "Retry-After": "60",
        "Cache-Control": "no-store",
      },
    });
  }

  const snapshot = stored.snapshot;
  const user = snapshot.user;

  // A synced snapshot with no user means GitHub itself returned nothing for this login — the
  // account does not exist. That genuinely is a 404, and the page agrees (`if (!user && !rateLimited)
  // return notFound()`).
  if (!user) {
    return new Response("Not found", { status: 404 });
  }

  const mergedPRs: MergedPR[] = (snapshot.mergedPRs ?? [])
    .filter((pr) => pr && typeof pr.url === "string" && typeof pr.title === "string" && (!pr.state || pr.state === "merged"))
    .slice(0, MAX_ITEMS);

  const displayName = user.name || username;
  const profileUrl = `${SITE_URL}/${encodeURIComponent(username)}`;
  const feedUrl = `${profileUrl}/rss.xml`;

  // The newest item's merge time, falling back to the snapshot's sync time. Readers use this to
  // decide whether to bother re-parsing, so a value that never changes is worse than none.
  const lastBuildDate =
    toRfc822(mergedPRs[0]?.mergedAt) ?? toRfc822(stored?.syncedAt) ?? new Date().toUTCString();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(`${displayName} — merged pull requests`)}</title>`,
    `    <link>${escapeXml(profileUrl)}</link>`,
    // Required by the RSS Advisory Board's validator, and by several readers, to identify the feed's
    // own canonical location. Omitting it is the single most common way a feed "validates fine in a
    // browser" and then misbehaves in an actual reader.
    `    <atom:link href="${escapeXml(
      feedUrl
    )}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(
      `Recent open-source pull requests merged by ${displayName}, via OSSfolio.`
    )}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    `    <generator>OSSfolio</generator>`,
    ...mergedPRs.map(buildItem),
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      // The charset is not optional: without it some readers guess, and a PR title containing an
      // em-dash or a non-Latin script comes out mangled.
      "Content-Type": "application/rss+xml; charset=utf-8",
      // The underlying snapshot has a one-hour TTL (SNAPSHOT_TTL_MS), so there is nothing to gain
      // from letting readers poll harder than that. `stale-while-revalidate` keeps the feed served
      // from cache while a fresher copy is fetched, rather than making a reader wait.
      "Cache-Control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
