import { describe, it, expect } from 'vitest';
import { normalizeSkill, toggleEndorsement } from '../endorsements';

describe('endorsements module', () => {
  it('normalizes skill string correctly', () => {
    expect(normalizeSkill('  React  ')).toBe('React');
    expect(normalizeSkill('TypeScript')).toBe('TypeScript');
  });

  it('prevents self-endorsement', async () => {
    const userId = 'user-123';
    const username = 'octocat';
    const profileUserId = 'user-123'; // Same user ID

    const result = await toggleEndorsement(
      userId,
      username,
      profileUserId,
      'React',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot endorse your own skills');
  });

  it('rejects endorsement with missing parameters', async () => {
    const result = await toggleEndorsement('', 'octocat', 'user-456', 'Go');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid parameters');
  });
});
