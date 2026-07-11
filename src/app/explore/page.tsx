import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/lib/supabase";
import { Pagination } from "@/components/ui/pagination";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Explore Contributors",
  description:
    "Browse the OSSfolio leaderboard of top open-source contributors ranked by contribution score. Search, filter by language, and discover active open-source developers.",
};

const PAGE_SIZE = 50;

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
  searchParams: Promise<{ page?: string; q?: string; sortBy?: string; type?: string }>;
}

async function fetchPage(
  page: number,
  searchQuery: string,
  sortBy: string,
  type: string
): Promise<{ rows: LeaderboardData[]; hasNext: boolean }> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const isOrg = type === "organizations";

  try {
    let query;

    if (isOrg) {
      query = supabase
        .from("organizations")
        .select("name, slug, avatar_url, score");
      
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }
      query = query
        .order("score", { ascending: false })
        .order("slug", { ascending: true });
    } else {
      query = supabase
        .from("profiles")
        .select("username, name, avatar_url, score, total_prs, total_issues, total_commits, score_delta_30_days");
      
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`);
      }

      let orderColumn = "score";
      if (sortBy === "prs") orderColumn = "total_prs";
      else if (sortBy === "commits") orderColumn = "total_commits";
      else if (sortBy === "issues") orderColumn = "total_issues";
      else if (sortBy === "improvement") orderColumn = "score_delta_30_days";

      query = query
        .order(orderColumn, { ascending: false })
        .order("updated_at", { ascending: false })
        .order("username", { ascending: true });
    }

    query = query.range(from, to);

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return { rows: [], hasNext: false };
    const hasNext = data.length > PAGE_SIZE;
    return { rows: (data as LeaderboardData[]).slice(0, PAGE_SIZE), hasNext };
  } catch {
    return { rows: [], hasNext: false };
  }
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { page: pageParam, q: qParam, sortBy: sortByParam, type: typeParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const searchQuery = typeof qParam === "string" ? qParam.trim() : "";
  const sortBy = typeof sortByParam === "string" ? sortByParam : "score";
  const type = typeParam === "organizations" ? "organizations" : "users";

  const { rows, hasNext } = await fetchPage(page, searchQuery, sortBy, type);
  const hasPrev = page > 1;
  const rankOffset = (page - 1) * PAGE_SIZE;

  return (
    <>
      <Navbar />
      <main id="main-content" style={{ backgroundColor: "var(--color-canvas)", color: "var(--color-ink)", minHeight: "100vh" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "56px 20px" }}>
          
          <header style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
              Explore {type === "organizations" ? "Organizations" : "Contributors"}
            </h1>
          </header>

          {/* Toggle Tabs */}
          <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--color-hairline)", marginBottom: "24px" }}>
            {["users", "organizations"].map((tab) => (
  <Link
    key={tab}
    href={{
      pathname: "/explore",
      query: { type: tab, q: searchQuery, sortBy }
    }}
    style={{
                  paddingBottom: "12px",
                  fontSize: "14px",
                  fontWeight: type === tab ? 600 : 500,
                  color: type === tab ? "var(--color-primary)" : "var(--color-ink-mute)",
                  borderBottom: type === tab ? "2px solid var(--color-primary)" : "none",
                  textTransform: "capitalize",
                  textDecoration: "none",
                }}
              >
                {tab}
              </Link>
            ))}
          </div>

          {/* Search/Sort */}
          <form method="GET" action="/explore" style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            <input type="hidden" name="type" value={type} />
            <input type="text" name="q" defaultValue={searchQuery} placeholder="Search..." style={{ flex: "1", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--color-hairline)", background: "var(--color-canvas)", color: "var(--color-ink)" }} />
            {type === "users" && (
              <select name="sortBy" defaultValue={sortBy} style={{ padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--color-hairline)", background: "var(--color-canvas)", color: "var(--color-ink)" }}>
                <option value="score">Sort by Score</option>
                <option value="improvement">Sort by Most Improved</option>
                <option value="prs">Sort by PRs</option>
                <option value="commits">Sort by Commits</option>
                <option value="issues">Sort by Issues</option>
              </select>
            )}
            <button type="submit" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)", border: "none", borderRadius: "6px", padding: "10px 20px" }}>Apply</button>
          </form>

          {rows.length === 0 ? (
            <div style={{ border: "1px solid var(--color-hairline)", borderRadius: "12px", padding: "48px 24px", textAlign: "center" }}>
              <p>No results found.</p>
            </div>
          ) : (
            <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0 }}>
              {rows.map((row, index) => {
                const rank = rankOffset + index + 1;
                const isOrg = type === "organizations";
                const rowData = row as any;
                const name = isOrg ? rowData.name : (rowData.name || rowData.username);
                const sub = isOrg ? `@${rowData.slug}` : `@${rowData.username}`;
               // Replace line 171 with this:
const avatar = rowData.avatar_url || `https://github.com/${isOrg ? encodeURIComponent(rowData.slug) : encodeURIComponent(rowData.username)}.png`;
                const score = typeof rowData.score === "number" ? rowData.score : 0;
                const isTop = rank <= 3;

                return (
                  <li key={isOrg ? rowData.slug : rowData.username}>
                    <Link 
  href={{
    pathname: isOrg ? `/org/${encodeURIComponent(rowData.slug)}` : `/${encodeURIComponent(rowData.username)}`
  }} 
  style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 18px", border: "1px solid var(--color-hairline)", borderRadius: "12px", textDecoration: "none", background: "var(--color-canvas-soft)" }}
>
                      {/* Rank Indicator */}
                      <span aria-label={`Rank ${rank}`} style={{ minWidth: "32px", fontSize: "16px", fontWeight: 600, color: isTop ? "var(--color-primary)" : "var(--color-ink-mute)", textAlign: "center", flexShrink: 0 }}>
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                      </span>

                      {/* Avatar Element */}
                      <Image src={avatar} alt={name} width={40} height={40} style={{ borderRadius: "9999px", border: "1px solid var(--color-hairline)", flexShrink: 0 }} />

                      {/* Info Metadata */}
                      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ fontSize: "13px", color: "var(--color-ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
                        {isOrg ? (
                          <span style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 500 }}>
                            Active Organization Member Network
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--color-ink-mute-2)" }}>
                            {rowData.total_prs || 0} PRs, {rowData.total_issues || 0} issues, {rowData.total_commits || 0} commits
                          </span>
                        )}
                      </span>

                      {/* Score Value Rendering */}
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: "65px", flexShrink: 0 }}>
                        <span style={{ fontSize: "24px", fontWeight: 600, color: "var(--color-primary)", lineHeight: 1 }}>{score}</span>
                        {sortBy === "improvement" && typeof rowData.score_delta_30_days === "number" ? (
                          <span style={{ fontSize: "11px", color: rowData.score_delta_30_days > 0 ? "#10b981" : "var(--color-ink-mute)", fontWeight: 600, marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }} title="Improvement over last 30 days">
                            {rowData.score_delta_30_days > 0 ? `📈 +${rowData.score_delta_30_days}` : `➖ ${rowData.score_delta_30_days}`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--color-ink-mute)", marginTop: "3px" }}>score</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          <Pagination currentPage={page} hasNext={hasNext} hasPrev={hasPrev} baseUrl="/explore" searchParams={{ q: searchQuery, type, sortBy }} />
        </div>
      </main>
      <Footer />
    </>
  );
}