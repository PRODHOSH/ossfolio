import { describe, it, expect } from 'vitest';
import {
  extractOwnerFromRepo,
  aggregateOrgContributionStats,
} from '../org-stats';
import type { Org, PRImpactDetails, IssueImpactDetails } from '@/types';

describe('org-stats aggregation module', () => {
  it('extracts owner login from repository full names correctly', () => {
    expect(extractOwnerFromRepo('facebook/react')).toBe('facebook');
    expect(extractOwnerFromRepo('vercel/next.js')).toBe('vercel');
    expect(extractOwnerFromRepo('invalid-repo-name')).toBeNull();
  });

  it('aggregates PRs and issues by organization login', () => {
    const orgs: Org[] = [
      {
        login: 'facebook',
        name: 'Meta / Facebook',
        avatarUrl: 'https://github.com/facebook.png',
        url: 'https://github.com/facebook',
      },
      {
        login: 'vercel',
        name: 'Vercel',
        avatarUrl: 'https://github.com/vercel.png',
        url: 'https://github.com/vercel',
      },
    ];

    const prs: PRImpactDetails[] = [
      {
        repositoryName: 'facebook/react',
        prNumber: 101,
        title: 'Fix hook bug',
        stars: 100,
      },
      {
        repositoryName: 'facebook/react',
        prNumber: 102,
        title: 'Add feature',
        stars: 100,
      },
      {
        repositoryName: 'vercel/next.js',
        prNumber: 201,
        title: 'Update SSR',
        stars: 50,
      },
    ];

    const issues: IssueImpactDetails[] = [
      {
        repositoryName: 'facebook/react',
        issueNumber: 55,
        title: 'Memory leak',
        stars: 100,
      },
    ];

    const enrichedOrgs = aggregateOrgContributionStats(orgs, prs, issues);

    const facebookOrg = enrichedOrgs.find((o) => o.login === 'facebook');
    expect(facebookOrg?.stats?.prsCount).toBe(2);
    expect(facebookOrg?.stats?.issuesCount).toBe(1);

    const vercelOrg = enrichedOrgs.find((o) => o.login === 'vercel');
    expect(vercelOrg?.stats?.prsCount).toBe(1);
    expect(vercelOrg?.stats?.issuesCount).toBeUndefined();
  });
});
