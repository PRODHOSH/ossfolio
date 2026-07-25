import type {
  ImpactNetworkData,
  NetworkNode,
  NetworkEdge,
  MergedPR,
  Org,
  CoContributor,
} from '@/types';

export interface BuildNetworkParams {
  user: {
    login: string;
    name?: string | null;
    avatar_url?: string;
    html_url?: string;
    public_repos?: number;
    followers?: number;
    bio?: string | null;
  };
  repos?: Array<{
    name: string;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    html_url?: string;
    description?: string | null;
  }>;
  orgs?: Org[];
  mergedPRs?: MergedPR[];
  coContributors?: CoContributor[];
}

export function buildImpactNetwork({
  user,
  repos = [],
  orgs = [],
  mergedPRs = [],
  coContributors = [],
}: BuildNetworkParams): ImpactNetworkData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const nodeMap = new Set<string>();

  const centralId = `user:${user.login.toLowerCase()}`;
  const centralLabel = user.name || user.login;

  // 1. Central Contributor Node
  nodes.push({
    id: centralId,
    label: centralLabel,
    type: 'contributor',
    avatarUrl: user.avatar_url,
    url: user.html_url || `https://github.com/${user.login}`,
    val: 28,
    color: '#3ecf8e', // Emerald
    details: user.bio || `@${user.login}`,
    statsText: `${user.public_repos ?? repos.length} repos • ${user.followers ?? 0} followers`,
  });
  nodeMap.add(centralId);

  // Map PR count per repo to calculate contribution edge thickness
  const repoPRCountMap = new Map<string, number>();
  for (const pr of mergedPRs) {
    const rName = pr.repoName?.toLowerCase();
    if (rName) {
      repoPRCountMap.set(rName, (repoPRCountMap.get(rName) || 0) + 1);
    }
  }

  // 2. Repository Nodes
  const topRepos = repos.slice(0, 15); // limit to top 15 repos for clear visualization
  for (const repo of topRepos) {
    const repoId = `repo:${repo.name.toLowerCase()}`;
    if (nodeMap.has(repoId)) continue;

    const prCount = repoPRCountMap.get(repo.name.toLowerCase()) || 0;
    const stars = repo.stargazers_count || 0;
    const size = Math.max(12, Math.min(22, 12 + Math.log2(stars + 1) * 1.5));

    nodes.push({
      id: repoId,
      label: repo.name,
      type: 'repo',
      url: repo.html_url || `https://github.com/${user.login}/${repo.name}`,
      val: size,
      color: '#60a5fa', // Soft Blue
      details:
        repo.description ||
        (repo.language ? `Primary: ${repo.language}` : 'Repository'),
      statsText: `⭐ ${stars} stars • 🍴 ${repo.forks_count || 0} forks${prCount > 0 ? ` • ${prCount} PRs` : ''}`,
    });
    nodeMap.add(repoId);

    // Edge thickness based on PR count and stars
    const weight = Math.max(
      1,
      Math.min(7, 1 + prCount * 1.5 + Math.min(3, stars / 10)),
    );
    edges.push({
      source: centralId,
      target: repoId,
      weight,
      label: prCount > 0 ? `${prCount} PRs` : 'Repository',
    });
  }

  // 3. Organization Nodes
  for (const org of orgs.slice(0, 8)) {
    const orgId = `org:${org.login.toLowerCase()}`;
    if (nodeMap.has(orgId)) continue;

    nodes.push({
      id: orgId,
      label: org.name || org.login,
      type: 'org',
      avatarUrl: org.avatarUrl,
      url: org.url || `https://github.com/${org.login}`,
      val: 18,
      color: '#c084fc', // Purple
      details: 'Organization Member / Contributor',
      statsText: `@${org.login}`,
    });
    nodeMap.add(orgId);

    edges.push({
      source: centralId,
      target: orgId,
      weight: 3,
      label: 'Member',
    });
  }

  // 4. Collaborator Nodes (Co-contributors)
  const allCollaborators = [...coContributors];

  // If no co-contributors fetched from GraphQL, generate collaborator nodes from merged PR repos
  if (allCollaborators.length === 0 && mergedPRs.length > 0) {
    const repoNames = Array.from(
      new Set(mergedPRs.map((p) => p.repoName).filter(Boolean)),
    );
    repoNames.slice(0, 5).forEach((rName, idx) => {
      if (rName.includes('/')) {
        const owner = rName.split('/')[0];
        if (owner.toLowerCase() !== user.login.toLowerCase()) {
          allCollaborators.push({
            login: owner,
            avatarUrl: `https://github.com/${owner}.png`,
            repoName: rName,
            contributionsCount: 2 + idx,
          });
        }
      }
    });
  }

  for (const collab of allCollaborators.slice(0, 10)) {
    const collabId = `collab:${collab.login.toLowerCase()}`;

    if (!nodeMap.has(collabId)) {
      nodes.push({
        id: collabId,
        label: `@${collab.login}`,
        type: 'collaborator',
        avatarUrl: collab.avatarUrl || `https://github.com/${collab.login}.png`,
        url: `https://github.com/${collab.login}`,
        val: 14,
        color: '#fbbf24', // Amber
        details: 'Co-contributor / Maintainer',
        statsText: `${collab.contributionsCount || 1} joint contributions`,
      });
      nodeMap.add(collabId);
    }

    const targetRepoId = collab.repoName
      ? `repo:${collab.repoName.toLowerCase()}`
      : null;
    const targetId =
      targetRepoId && nodeMap.has(targetRepoId) ? targetRepoId : centralId;

    edges.push({
      source: collabId,
      target: targetId,
      weight: Math.max(1, Math.min(5, collab.contributionsCount || 2)),
      label: 'Co-contributor',
    });
  }

  return { nodes, edges };
}
