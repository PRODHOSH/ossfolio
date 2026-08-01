import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncProfileSnapshot } from '../profile-snapshot';
import { refreshProfile } from '../refresh-profile';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/profile-data', () => ({
  fetchGitHubUser: vi.fn(),
  fetchGitHubRepos: vi.fn(),
  fetchLiveStats: vi.fn(),
  fetchOrganizations: vi.fn(),
  fetchMergedPRs: vi.fn(),
}));

vi.mock('@/lib/github', () => ({
  fetchContributionCalendar: vi.fn(),
}));

describe('PostgreSQL Transactional Advisory Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  });

  describe('syncProfileSnapshot Advisory Locking', () => {
    it('should abort sync immediately if RPC advisory lock acquisition returns false', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });
      const mockAdmin = {
        rpc: mockRpc,
        from: vi.fn(),
      };
      vi.mocked(createClient).mockReturnValue(mockAdmin as never);

      await syncProfileSnapshot('octocat');

      expect(mockRpc).toHaveBeenCalledWith('try_acquire_profile_refresh_lock', {
        p_username: 'octocat',
      });
      // Verification: because advisory lock was rejected (false), from() was never called for table insertion
      expect(mockAdmin.from).not.toHaveBeenCalled();
    });

    it('should proceed to insert claim row when advisory lock is acquired (true)', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockAdmin = {
        rpc: mockRpc,
        from: mockFrom,
      };
      vi.mocked(createClient).mockReturnValue(mockAdmin as never);

      await syncProfileSnapshot('octocat');

      expect(mockRpc).toHaveBeenCalledWith('try_acquire_profile_refresh_lock', {
        p_username: 'octocat',
      });
      expect(mockFrom).toHaveBeenCalledWith('profile_snapshots');
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('refreshProfile Advisory Locking', () => {
    it('should return rate_limited status code when advisory lock is held by concurrent worker', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });
      const mockSupabase = {
        rpc: mockRpc,
        from: vi.fn(),
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const result = await refreshProfile('octocat');

      expect(result).toEqual({
        status: 'rate_limited',
        retryAfterSeconds: 600,
      });
      expect(mockRpc).toHaveBeenCalledWith('try_acquire_profile_refresh_lock', {
        p_username: 'octocat',
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });
});
