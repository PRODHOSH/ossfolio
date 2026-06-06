import { fetchLiveStats, fetchOrganizations } from "@/lib/profile-data";
import { mapRepos } from "@/lib/profile-data";
import { generateMockHeatmap } from "@/lib/mock";
import { calculateScore } from "@/lib/score";
import { supabase } from "@/lib/supabase";

export async function getProfileOGData(username: string) {
  const userRes = await fetch(
    `https://api.github.com/users/${username}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!userRes.ok) return null;

  const user = await userRes.json();

  const reposRes = await fetch(
    `https://api.github.com/users/${username}/repos?sort=stars&per_page=12&type=owner`,
  );

  const repos = reposRes.ok ? await reposRes.json() : [];

  const mappedRepos = mapRepos(repos);

  const liveStats = await fetchLiveStats(username);

  const { totalContributions } =
    generateMockHeatmap(username);

  const stats = {
    ...liveStats,
    totalContributions,
  };

  let score = calculateScore(stats, mappedRepos);

  try {
    const { data } = await supabase
      .from("profiles")
      .select("score")
      .eq("username", username)
      .maybeSingle();

    if (data?.score) {
      score = data.score;
    }
  } catch {}

  return {
    username,
    name: user.name || username,
    avatarUrl: user.avatar_url,
    score,
  };
}