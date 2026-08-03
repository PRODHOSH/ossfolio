import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  fetchExploreProfiles,
  fetchExploreOrganizations,
  type ExploreProfileSort,
} from "@/lib/db";
import { DiscoverPagination } from "@/components/discover/DiscoverPagination";
import { POPULAR_LANGUAGES } from "@/lib/languages";
import {
  SCORE_TIERS,
  normalizeLanguage,
  normalizeScoreTier,
  buildExploreQuery,
  hasActiveFilters,
  type ExploreFilters,
} from "@/lib/explore-filters";
import { fetchTrendingProjects } from "@/lib/trending-projects";
import { ProjectsToWatch } from "@/components/discover/ProjectsToWatch";

// Runtime managed by @opennextjs/cloudflare

export const metadata: Metadata = {
  title: "Explore Contributors",
  description:
    "Browse the OSSfolio leaderboard of top open-source contributors ranked by contribution score. Search, filter by language, and discover active open-source developers.",
};

const PAGE_SIZE = 50;

/**
 * Filter pill styling. DESIGN.md treats the emerald primary as the only
 * chromatic event, so an inactive pill is monochrome and the active one is the
 * single point of colour.
 */
const pillStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  padding: "6px 12px",
  borderRadius: "999px",
  border: "1px solid var(--color-hairline)",
  color: "var(--color-ink-mute)",
  backgroundColor: "var(--color-canvas)",
  textDecoration: "none",
  lineHeight: 1.4,
};

const activePillStyle: React.CSSProperties = {
  ...pillStyle,
  fontWeight: 600,
  color: "var(--color-on-primary)",
  backgroundColor: "var(--color-primary)",
  borderColor: "var(--color-primary)",
};

interface LeaderboardRow {
  username: string;
  name: string | null;
  avatar_url: string | null;
  score: number | null;
  total_prs: number | null;
  total_issues: number | null;
  total_commits: number | null;
  score_delta_30_days?: number | null;
}

interface OrgLeaderboardRow {
  name: string;
  slug: string;
  avatar_url: string | null;
  score: number | null;
}

type LeaderboardData = LeaderboardRow | OrgLeaderboardRow;

interface ExplorePageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sortBy?: string;
    type?: string;
    lang?: string;
    minScore?: string;
  }>;
}

async function fetchPage(
  page: number,
  searchQuery: string,
  sortBy: string,
  type: string,
  lang: string | null,
  minScore: number,
): Promise<{ rows: LeaderboardData[]; hasNext: boolean }> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const isOrg = type === "organizations";

  try {
    const { data, error } = isOrg
      ? await fetchExploreOrganizations({ searchQuery, from, to })
      : await fetchExploreProfiles({
          searchQuery,
          sortBy: sortBy as ExploreProfileSort,
          from,
          to,
          lang,
          minScore,
        });
    if (error || !Array.isArray(data)) return { rows: [], hasNext: false };
    const hasNext = data.length > PAGE_SIZE;
    return { rows: (data as LeaderboardData[]).slice(0, PAGE_SIZE), hasNext };
  } catch {
    return { rows: [], hasNext: false };
  }
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const {
    page: pageParam,
    q: qParam,
    sortBy: sortByParam,
    type: typeParam,
    lang: langParam,
    minScore: minScoreParam,
  } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const searchQuery = typeof qParam === "string" ? qParam.trim() : "";
  const VALID_SORT_OPTIONS = new Set([
    "score",
    "prs",
    "commits",
    "issues",
    "improvement",
  ]);
  const sortBy =
    typeof sortByParam === "string" && VALID_SORT_OPTIONS.has(sortByParam)
      ? sortByParam
      : "score";
  const VALID_TYPES = new Set(["users", "organizations"]);
  const type =
    typeof typeParam === "string" && VALID_TYPES.has(typeParam)
      ? typeParam
      : "users";

  // Organisations have no language or score-tier data, so those filters only
  // apply to the contributor listing.
  const lang = type === "users" ? normalizeLanguage(langParam) : null;
  const minScore = type === "users" ? normalizeScoreTier(minScoreParam) : 0;

  const activeFilters: ExploreFilters = {
    type,
    q: searchQuery,
    sortBy,
    lang,
    minScore,
    page,
  };

  const { rows, hasNext } = await fetchPage(
    page,
    searchQuery,
    sortBy,
    type,
    lang,
    minScore,
  );
  const trendingProjects = await fetchTrendingProjects(6);
  const hasPrev = page > 1;
  const rankOffset = (page - 1) * PAGE_SIZE;

  return (
    <>
      <Navbar />
      <main
        id="main-content"
        style={{
          backgroundColor: "var(--color-canvas)",
          color: "var(--color-ink)",
          minHeight: "100vh",
        }}
      >
        <div
          style={{ maxWidth: "56rem", margin: "0 auto", padding: "56px 20px" }}
        >
          <header style={{ marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              Explore{" "}
              {type === "organizations" ? "Organizations" : "Contributors"}
            </h1>
          </header>

          {/* Projects to Watch section */}
          <ProjectsToWatch projects={trendingProjects} />

          {/* Toggle Tabs */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              borderBottom: "1px solid var(--color-hairline)",
              marginBottom: "24px",
            }}
          >
            {["users", "organizations"].map((tab) => (
              <Link
                key={tab}
                href={{
                  pathname: "/explore",
                  query: { type: tab, q: searchQuery, sortBy },
                }}
                style={{
                  paddingBottom: "12px",
                  fontSize: "14px",
                  fontWeight: type === tab ? 600 : 500,
                  color:
                    type === tab
                      ? "var(--color-primary)"
                      : "var(--color-ink-mute)",
                  borderBottom:
                    type === tab ? "2px solid var(--color-primary)" : "none",
                  textTransform: "capitalize",
                  textDecoration: "none",
                }}
              >
                {tab}
              </Link>
            ))}
          </div>

          {/* Search/Sort */}
          <form
            method="GET"
            action="/explore"
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            <input type="hidden" name="type" value={type} />
            {/* Without these, submitting a search would drop the active filter
                pills and quietly widen the result set. */}
            {lang && <input type="hidden" name="lang" value={lang} />}
            {minScore > 0 && (
              <input type="hidden" name="minScore" value={String(minScore)} />
            )}
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search..."
              style={{
                flex: "1",
                padding: "10px 14px",
                borderRadius: "6px",
                border: "1px solid var(--color-hairline)",
                background: "var(--color-canvas)",
                color: "var(--color-ink)",
              }}
            />
            {type === "users" && (
              <select
                name="sortBy"
                defaultValue={sortBy}
                style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline)",
                  background: "var(--color-canvas)",
                  color: "var(--color-ink)",
                }}
              >
                <option value="score">Sort by Score</option>
                <option value="improvement">Sort by Most Improved</option>
                <option value="prs">Sort by PRs</option>
                <option value="commits">Sort by Commits</option>
                <option value="issues">Sort by Issues</option>
              </select>
            )}
            <button
              type="submit"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-on-primary)",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
              }}
            >
              Apply
            </button>
          </form>

          {/* Filter pills — server-rendered links so every filtered view has a
              shareable URL, rather than client state that vanishes on reload. */}
          {type === "users" && (
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-ink-mute)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginRight: "4px",
                  }}
                >
                  Language
                </span>
                <Link
                  href={{
                    pathname: "/explore",
                    query: buildExploreQuery(activeFilters, { lang: null }),
                  }}
                  style={lang === null ? activePillStyle : pillStyle}
                  aria-current={lang === null ? "true" : undefined}
                >
                  All
                </Link>
                {POPULAR_LANGUAGES.map((option) => (
                  <Link
                    key={option}
                    href={{
                      pathname: "/explore",
                      query: buildExploreQuery(activeFilters, {
                        // Clicking the active pill clears it, so a filter can
                        // always be undone without hunting for a reset button.
                        lang: lang === option ? null : option,
                      }),
                    }}
                    style={lang === option ? activePillStyle : pillStyle}
                    aria-current={lang === option ? "true" : undefined}
                  >
                    {option}
                  </Link>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-ink-mute)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginRight: "4px",
                  }}
                >
                  Score
                </span>
                {SCORE_TIERS.map((tier) => (
                  <Link
                    key={tier.value}
                    href={{
                      pathname: "/explore",
                      query: buildExploreQuery(activeFilters, {
                        minScore: tier.value,
                      }),
                    }}
                    style={
                      minScore === tier.value ? activePillStyle : pillStyle
                    }
                    aria-current={minScore === tier.value ? "true" : undefined}
                  >
                    {tier.label}
                  </Link>
                ))}
              </div>

              {hasActiveFilters(activeFilters) && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-ink-mute)",
                    margin: "16px 0 0 0",
                  }}
                >
                  Showing {describeFilters(activeFilters)}.{" "}
                  <Link
                    href={{ pathname: "/explore", query: { type } }}
                    style={{
                      color: "var(--color-primary)",
                      textDecoration: "none",
                    }}
                  >
                    Clear all
                  </Link>
                </p>
              )}
            </div>
          )}

          {rows.length === 0 ? (
            <div
              style={{
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <p>
                {hasActiveFilters(activeFilters)
                  ? `No contributors match ${describeFilters(activeFilters)}.`
                  : "No results found."}
              </p>
            </div>
          ) : (
            <ol
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                margin: 0,
                padding: 0,
              }}
            >
              {rows.map((row, index) => {
                const rank = rankOffset + index + 1;
                const isOrg = 'slug' in row;
                const name = isOrg
                  ? row.name
                  : row.name || row.username;
                const sub = isOrg ? `@${row.slug}` : `@${row.username}`;
                const linkId = isOrg ? row.slug : row.username;
                const avatar =
                  row.avatar_url ||
                  `https://github.com/${encodeURIComponent(linkId)}.png`;
                const score =
                  typeof row.score === "number" ? row.score : 0;
                const isTop = rank <= 3;

                return (
                  <li key={linkId}>
                    <Link
                      href={{
                        pathname: isOrg
                          ? `/org/${encodeURIComponent(row.slug)}`
                          : `/${encodeURIComponent(row.username)}`,
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 18px",
                        border: "1px solid var(--color-hairline)",
                        borderRadius: "12px",
                        textDecoration: "none",
                        background: "var(--color-canvas-soft)",
                      }}
                    >
                      {/* Rank Indicator */}
                      <span
                        aria-label={`Rank ${rank}`}
                        style={{
                          minWidth: "32px",
                          fontSize: "16px",
                          fontWeight: 600,
                          color: isTop
                            ? "var(--color-primary)"
                            : "var(--color-ink-mute)",
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        {rank === 1
                          ? "🥇"
                          : rank === 2
                            ? "🥈"
                            : rank === 3
                              ? "🥉"
                              : rank}
                      </span>

                      {/* Avatar Element */}
                      <Image
                        src={avatar}
                        alt={name}
                        width={40}
                        height={40}
                        style={{
                          borderRadius: "9999px",
                          border: "1px solid var(--color-hairline)",
                          flexShrink: 0,
                        }}
                      />

                      {/* Info Metadata */}
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--color-ink-mute)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sub}
                        </span>
                        {isOrg ? (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--color-primary)",
                              fontWeight: 500,
                            }}
                          >
                            Active Organization Member Network
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--color-ink-mute-2)",
                            }}
                          >
                            {row.total_prs || 0} PRs,{" "}
                            {row.total_issues || 0} issues,{" "}
                            {row.total_commits || 0} commits
                          </span>
                        )}
                      </span>

                      {/* Score Value Rendering */}
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          minWidth: "65px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "24px",
                            fontWeight: 600,
                            color: "var(--color-primary)",
                            lineHeight: 1,
                          }}
                        >
                          {score}
                        </span>
                        {!isOrg && sortBy === "improvement" &&
                        typeof row.score_delta_30_days === "number" ? (
                          <span
                            style={{
                              fontSize: "11px",
                              color:
                                row.score_delta_30_days > 0
                                  ? "#10b981"
                                  : "var(--color-ink-mute)",
                              fontWeight: 600,
                              marginTop: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                            title="Improvement over last 30 days"
                          >
                            {row.score_delta_30_days > 0
                              ? `📈 +${row.score_delta_30_days}`
                              : `➖ ${row.score_delta_30_days}`}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-ink-mute)",
                              marginTop: "3px",
                            }}
                          >
                            score
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          <DiscoverPagination
            currentPage={page}
            hasNext={hasNext}
            hasPrev={hasPrev}
            baseUrl="/explore"
            // Built from the same helper as the filter pills, so paging keeps
            // the active language and score tier. Passing the raw params here
            // would drop them and silently widen the results on page 2.
            searchParams={buildExploreQuery(activeFilters)}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
