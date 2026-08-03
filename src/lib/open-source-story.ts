import type { ContributorStats, Repo } from "@/types";

export interface OpenSourceStory {
  username: string;
  year: number;
  score: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalReviews: number;
  topLanguage: string | null;
  topRepos: string[];
  markdown: string;
  tweetText: string;
}

/**
 * Derives top programming language from repository listing
 */
export function getTopLanguage(repos: Repo[]): string | null {
  if (!repos || repos.length === 0) return null;
  const counts: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) {
      counts[r.language] = (counts[r.language] || 0) + 1;
    }
  });

  let topLang: string | null = null;
  let maxCount = 0;
  Object.entries(counts).forEach(([lang, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topLang = lang;
    }
  });
  return topLang;
}

/**
 * Generates structured Year in Open Source Story
 */
export function generateOpenSourceStory(
  username: string,
  stats: ContributorStats,
  repos: Repo[] = [],
  score = 0,
  year: number = new Date().getFullYear(),
): OpenSourceStory {
  const topLanguage = getTopLanguage(repos);
  const topRepos = repos.slice(0, 3).map((r) => r.name);

  const profileUrl = `https://ossfolio.qzz.io/${username}`;

  const markdownLines = [
    `# 🚀 My ${year} Open Source Story — @${username}`,
    "",
    `In ${year}, I actively contributed to the open-source ecosystem:`,
    `- 📊 **OSSfolio Score**: ${score.toLocaleString("en-US")}`,
    `- ⚡ **Commits Made**: ${stats.totalCommits.toLocaleString("en-US")}`,
    `- 🔀 **Pull Requests Merged**: ${stats.totalPRs.toLocaleString("en-US")}`,
    `- 🐛 **Issues Resolved**: ${stats.totalIssues.toLocaleString("en-US")}`,
    `- 👀 **Code Reviews**: ${stats.totalReviews.toLocaleString("en-US")}`,
  ];

  if (topLanguage) {
    markdownLines.push(`- 💻 **Top Language**: ${topLanguage}`);
  }

  if (topRepos.length > 0) {
    markdownLines.push(`- 🏆 **Key Repositories**: ${topRepos.join(", ")}`);
  }

  markdownLines.push("", `Generated with [OSSfolio](${profileUrl}) 🌟`);

  const markdown = markdownLines.join("\n");

  const tweetText = `In ${year}, I made ${stats.totalCommits} commits and merged ${stats.totalPRs} PRs on GitHub! OSSfolio Score: ${score}. Check out my Open Source Story: ${profileUrl} #opensource`;

  return {
    username,
    year,
    score,
    totalCommits: stats.totalCommits,
    totalPRs: stats.totalPRs,
    totalIssues: stats.totalIssues,
    totalReviews: stats.totalReviews,
    topLanguage,
    topRepos,
    markdown,
    tweetText,
  };
}
