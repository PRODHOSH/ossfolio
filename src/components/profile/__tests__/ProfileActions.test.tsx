import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileActions } from '../ProfileActions';
import type { ContributorStats } from '@/types';

const mockStats: ContributorStats = {
  totalCommits: 100,
  totalPRs: 20,
  totalIssues: 5,
  totalReviews: 10,
  totalContributions: 135,
};

describe('ProfileActions Accessibility Live Regions', () => {
  it('renders an ARIA live region container for screen reader announcements', () => {
    const { container } = render(
      <ProfileActions
        username="octocat"
        score={1450}
        stats={mockStats}
        isRefreshing={false}
        onRefresh={async () => {}}
      />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces progress and success with score string when refresh succeeds', async () => {
    const onRefreshMock = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <ProfileActions
        username="octocat"
        score={1450}
        stats={mockStats}
        isRefreshing={false}
        onRefresh={onRefreshMock}
      />,
    );

    const syncBtn = screen.getByRole('button', {
      name: /refresh github profile statistics/i,
    });
    fireEvent.click(syncBtn);

    const liveRegion = container.querySelector('[aria-live="polite"]');

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(
        'Profile stats refreshed successfully. New score: 1,450.',
      );
    });
  });

  it('announces error string when refresh fails', async () => {
    const onRefreshMock = vi
      .fn()
      .mockRejectedValue(new Error('API rate limit exceeded'));

    const { container } = render(
      <ProfileActions
        username="octocat"
        score={1450}
        stats={mockStats}
        isRefreshing={false}
        onRefresh={onRefreshMock}
      />,
    );

    const syncBtn = screen.getByRole('button', {
      name: /refresh github profile statistics/i,
    });
    fireEvent.click(syncBtn);

    const liveRegion = container.querySelector('[aria-live="polite"]');

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(
        'Failed to refresh profile stats: API rate limit exceeded.',
      );
    });
  });
});
