import { describe, it, expect } from 'vitest';
import { fetchProfileViewCount, incrementProfileView } from '../profile-views';

describe('profile-views module', () => {
  it('handles missing or empty username gracefully', async () => {
    const count = await fetchProfileViewCount('');
    expect(count).toBe(0);

    const inc = await incrementProfileView('');
    expect(inc).toBe(0);
  });

  it('returns fallback view count when database is unconfigured', async () => {
    const count = await fetchProfileViewCount('octocat');
    expect(typeof count).toBe('number');
  });
});
