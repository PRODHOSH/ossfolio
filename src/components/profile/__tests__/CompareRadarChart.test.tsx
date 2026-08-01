// Registers jest-dom's matchers *and* their TypeScript declarations. The shared
// vitest.setup.ts calls expect.extend, which works at runtime, but does not
// declare the matcher types — no existing test used DOM matchers, so this is
// the first place it matters. Importing here keeps the fix scoped to this file
// rather than changing shared test config.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ContributorStats, Repo } from '@/types';

/**
 * Component tests for the comparison radar.
 *
 * Recharts measures its container to decide what to draw, and jsdom reports
 * every element as zero-sized, so `ResponsiveContainer` renders nothing at all
 * under test. Stubbing it with a fixed-size wrapper is the standard way round
 * that and lets the chart's own children mount.
 *
 * Even then the SVG internals are not worth asserting on — they are recharts'
 * implementation, not ours. What these tests pin is the part this component
 * actually owns: the empty-state branch, the explanatory copy, the derivation
 * footnote, and the tooltip's raw-value output.
 */
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const { CompareRadarChart, RadarTooltip } =
  await import('../CompareRadarChart');

const stats = (
  totalCommits = 0,
  totalPRs = 0,
  totalReviews = 0,
  totalIssues = 0,
): ContributorStats => ({
  totalCommits,
  totalPRs,
  totalReviews,
  totalIssues,
  totalContributions: totalCommits + totalPRs + totalReviews + totalIssues,
});

const repo = (stars: number): Repo =>
  ({
    name: 'r',
    description: null,
    stars,
    forks: 0,
    language: null,
    languageColor: null,
    url: '',
    topics: [],
  }) as Repo;

beforeAll(() => {
  // Recharts warns about zero-size containers under jsdom; the stub above
  // handles rendering, and the noise obscures real failures.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('CompareRadarChart', () => {
  const userA = {
    username: 'alice',
    stats: stats(1000, 50, 200, 10),
    repos: [repo(500)],
  };
  const userB = {
    username: 'bob',
    stats: stats(500, 100, 20, 40),
    repos: [repo(250)],
  };

  it('renders the section heading', () => {
    render(<CompareRadarChart userA={userA} userB={userB} />);
    expect(screen.getByText('Contribution Profile Shape')).toBeInTheDocument();
  });

  it('explains that axes are scaled, so a reader is not misled by the shape', () => {
    render(<CompareRadarChart userA={userA} userB={userB} />);
    expect(screen.getByText(/scaled against the higher/i)).toBeInTheDocument();
  });

  it('discloses that Repo Stars is derived from top repositories', () => {
    render(<CompareRadarChart userA={userA} userB={userB} />);
    expect(screen.getByText(/top\s+repositories/i)).toBeInTheDocument();
  });

  it('shows an empty state when neither contributor has any data', () => {
    const empty = { username: 'x', stats: stats(), repos: [] };
    render(
      <CompareRadarChart userA={empty} userB={{ ...empty, username: 'y' }} />,
    );
    expect(
      screen.getByText('No contribution data available to compare.'),
    ).toBeInTheDocument();
  });

  it('does not show the empty state when either contributor has data', () => {
    const empty = { username: 'x', stats: stats(), repos: [] };
    render(
      <CompareRadarChart
        userA={{ ...empty, stats: stats(1) }}
        userB={{ ...empty, username: 'y' }}
      />,
    );
    expect(
      screen.queryByText('No contribution data available to compare.'),
    ).not.toBeInTheDocument();
  });

  it('keeps the derivation footnote visible in the empty state too', () => {
    const empty = { username: 'x', stats: stats(), repos: [] };
    render(
      <CompareRadarChart userA={empty} userB={{ ...empty, username: 'y' }} />,
    );
    expect(screen.getByText(/top\s+repositories/i)).toBeInTheDocument();
  });

  it('renders without throwing when stats and repos are missing', () => {
    const broken = { username: 'b' } as unknown as typeof userA;
    expect(() =>
      render(<CompareRadarChart userA={broken} userB={broken} />),
    ).not.toThrow();
  });
});

describe('RadarTooltip', () => {
  const payload = [
    { payload: { metric: 'Code Reviews', aRaw: 200, bRaw: 20 } },
  ];

  it('renders nothing when inactive', () => {
    const { container } = render(
      <RadarTooltip
        active={false}
        payload={payload}
        usernameA="alice"
        usernameB="bob"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is no payload', () => {
    const { container } = render(
      <RadarTooltip active payload={[]} usernameA="alice" usernameB="bob" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('names the hovered metric', () => {
    render(
      <RadarTooltip
        active
        payload={payload}
        usernameA="alice"
        usernameB="bob"
      />,
    );
    expect(screen.getByText('Code Reviews')).toBeInTheDocument();
  });

  it('reports raw totals for both contributors, not the normalised values', () => {
    render(
      <RadarTooltip
        active
        payload={payload}
        usernameA="alice"
        usernameB="bob"
      />,
    );
    // The chart plots 100 and 10 for these; the tooltip must show 200 and 20.
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/bob/)).toBeInTheDocument();
  });

  it('thousand-separates large totals', () => {
    render(
      <RadarTooltip
        active
        payload={[{ payload: { metric: 'Commits', aRaw: 12345, bRaw: 0 } }]}
        usernameA="alice"
        usernameB="bob"
      />,
    );
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('falls back to zero when a raw value is absent', () => {
    render(
      <RadarTooltip
        active
        payload={[{ payload: { metric: 'Issues Opened' } }]}
        usernameA="alice"
        usernameB="bob"
      />,
    );
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('renders nothing when the payload entry has no data', () => {
    const { container } = render(
      <RadarTooltip active payload={[{}]} usernameA="alice" usernameB="bob" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
