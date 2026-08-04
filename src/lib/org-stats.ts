import type { Org, PRImpactDetails, IssueImpactDetails, Repo } from "@/types";

/**
 * Extracts repository owner login from full repository string (e.g. "facebook/react" -> "facebook")
 */
export function extractOwnerFromRepo(repoFullName: string): string | null {
  if (!repoFullName || !repoFullName.includes("/")) return null;
  const parts = repoFullName.split("/");
  return parts[0].trim();
}

/**
 * Aggregates PRs and Issues by repository owner organization and attaches per-org stats.
 */
export function aggregateOrgContributionStats(
  orgs: Org[],
  prs: PRImpactDetails[] = [],
  issues: IssueImpactDetails[] = [],
  repos: Repo[] = [],
): Org[] {
  if (!orgs || orgs.length === 0) return [];

  const prCounts: Record<string, number> = {};
  const issueCounts: Record<string, number> = {};

  // Count PRs per org owner
  prs.forEach((pr) => {
    if (pr.repositoryName) {
      const owner = extractOwnerFromRepo(pr.repositoryName);
      if (owner) {
        const key = owner.toLowerCase();
        prCounts[key] = (prCounts[key] || 0) + 1;
      }
    }
  });

  // Count Issues per org owner
  issues.forEach((issue) => {
    if (issue.repositoryName) {
      const owner = extractOwnerFromRepo(issue.repositoryName);
      if (owner) {
        const key = owner.toLowerCase();
        issueCounts[key] = (issueCounts[key] || 0) + 1;
      }
    }
  });

  return orgs.map((org) => {
    const key = org.login.toLowerCase();
    const prsCount = prCounts[key] || 0;
    const issuesCount = issueCounts[key] || 0;

    if (prsCount > 0 || issuesCount > 0) {
      return {
        ...org,
        stats: {
          ...org.stats,
          prsCount: prsCount || undefined,
          issuesCount: issuesCount || undefined,
        },
      };
    }

    return org;
  });
}
