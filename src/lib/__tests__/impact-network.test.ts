import { describe, it, expect } from 'vitest';
import { buildImpactNetwork } from '../impact-network';

describe('buildImpactNetwork', () => {
  const sampleUser = {
    login: 'testuser',
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
    html_url: 'https://github.com/testuser',
    public_repos: 10,
    followers: 42,
    bio: 'Open source developer',
  };

  const sampleRepos = [
    {
      name: 'awesome-project',
      stargazers_count: 150,
      forks_count: 20,
      language: 'TypeScript',
      html_url: 'https://github.com/testuser/awesome-project',
      description: 'An awesome TypeScript project',
    },
    {
      name: 'helper-lib',
      stargazers_count: 10,
      forks_count: 2,
      language: 'JavaScript',
      html_url: 'https://github.com/testuser/helper-lib',
      description: 'A small helper library',
    },
  ];

  const sampleOrgs = [
    {
      login: 'acme-corp',
      name: 'Acme Corp',
      avatarUrl: 'https://example.com/acme.png',
      url: 'https://github.com/acme-corp',
    },
  ];

  const samplePRs = [
    {
      title: 'Add feature X',
      url: 'https://github.com/testuser/awesome-project/pull/1',
      repoName: 'awesome-project',
      mergedAt: '2026-01-01T00:00:00Z',
    },
    {
      title: 'Fix bug Y',
      url: 'https://github.com/testuser/awesome-project/pull/2',
      repoName: 'awesome-project',
      mergedAt: '2026-01-02T00:00:00Z',
    },
  ];

  const sampleCoContributors = [
    {
      login: 'alice',
      avatarUrl: 'https://example.com/alice.png',
      repoName: 'awesome-project',
      contributionsCount: 5,
    },
  ];

  it('should create a central node for the main contributor', () => {
    const { nodes } = buildImpactNetwork({
      user: sampleUser,
      repos: sampleRepos,
      orgs: sampleOrgs,
      mergedPRs: samplePRs,
      coContributors: sampleCoContributors,
    });

    const centralNode = nodes.find((n) => n.id === 'user:testuser');
    expect(centralNode).toBeDefined();
    expect(centralNode?.type).toBe('contributor');
    expect(centralNode?.label).toBe('Test User');
    expect(centralNode?.color).toBe('#3ecf8e');
  });

  it('should create repo and org nodes with correct connections', () => {
    const { nodes, edges } = buildImpactNetwork({
      user: sampleUser,
      repos: sampleRepos,
      orgs: sampleOrgs,
      mergedPRs: samplePRs,
      coContributors: sampleCoContributors,
    });

    const repoNode = nodes.find((n) => n.id === 'repo:awesome-project');
    expect(repoNode).toBeDefined();
    expect(repoNode?.type).toBe('repo');

    const orgNode = nodes.find((n) => n.id === 'org:acme-corp');
    expect(orgNode).toBeDefined();
    expect(orgNode?.type).toBe('org');

    const edgeToRepo = edges.find((e) => e.target === 'repo:awesome-project');
    expect(edgeToRepo).toBeDefined();
    expect(edgeToRepo?.source).toBe('user:testuser');
  });

  it('should process co-contributors and create collaborator nodes', () => {
    const { nodes, edges } = buildImpactNetwork({
      user: sampleUser,
      repos: sampleRepos,
      orgs: sampleOrgs,
      mergedPRs: samplePRs,
      coContributors: sampleCoContributors,
    });

    const collabNode = nodes.find((n) => n.id === 'collab:alice');
    expect(collabNode).toBeDefined();
    expect(collabNode?.type).toBe('collaborator');

    const edgeFromCollab = edges.find((e) => e.source === 'collab:alice');
    expect(edgeFromCollab).toBeDefined();
  });

  it('should handle empty optional inputs gracefully', () => {
    const { nodes, edges } = buildImpactNetwork({
      user: sampleUser,
    });

    expect(nodes.length).toBe(1);
    expect(nodes[0].id).toBe('user:testuser');
    expect(edges.length).toBe(0);
  });
});
