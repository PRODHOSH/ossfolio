import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enqueueDeadLetterPayload,
  processDeadLetterQueue,
} from '../webhook-dead-letter';
import { supabaseAdmin } from '../supabase';
import { refreshProfile } from '../refresh-profile';

vi.mock('../supabase', () => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock('../refresh-profile', () => ({
  refreshProfile: vi.fn(),
}));

describe('Webhook Dead-Letter Retry Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enqueueDeadLetterPayload', () => {
    it('should insert failed payload into webhook_dead_letter_queue table', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'dead-letter-123' },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.mocked(supabaseAdmin).mockReturnValue({
        from: mockFrom,
      } as never);

      const result = await enqueueDeadLetterPayload({
        eventType: 'push',
        username: 'octocat',
        payload: { repository: 'test-repo' },
        errorReason: 'transient_lock',
      });

      expect(result).toEqual({ success: true, id: 'dead-letter-123' });
      expect(mockFrom).toHaveBeenCalledWith('webhook_dead_letter_queue');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'push',
          username: 'octocat',
          error_reason: 'transient_lock',
          status: 'pending',
          retry_count: 0,
        }),
      );
    });

    it('should handle error when database insert fails', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Error' },
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.mocked(supabaseAdmin).mockReturnValue({
        from: mockFrom,
      } as never);

      const result = await enqueueDeadLetterPayload({
        eventType: 'push',
        username: 'octocat',
        payload: {},
      });

      expect(result.success).toBe(false);
    });
  });

  describe('processDeadLetterQueue', () => {
    it('should fetch due pending items, attempt refresh, and mark completed on success', async () => {
      const mockPendingItems = [
        {
          id: 'item-1',
          event_type: 'push',
          username: 'octocat',
          payload: {},
          retry_count: 0,
          max_retries: 5,
        },
      ];

      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: mockPendingItems, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqSelect = vi.fn().mockReturnValue({ lte: mockLte });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'webhook_dead_letter_queue') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      });

      vi.mocked(supabaseAdmin).mockReturnValue({
        from: mockFrom,
      } as never);

      vi.mocked(refreshProfile).mockResolvedValue({
        status: 'refreshed',
        username: 'octocat',
      });

      const stats = await processDeadLetterQueue(10);

      expect(stats).toEqual({
        processed: 1,
        succeeded: 1,
        failed: 0,
        retried: 0,
      });

      expect(refreshProfile).toHaveBeenCalledWith('octocat');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should schedule retry with exponential backoff when refresh fails transiently', async () => {
      const mockPendingItems = [
        {
          id: 'item-2',
          event_type: 'push',
          username: 'octocat',
          payload: {},
          retry_count: 1,
          max_retries: 5,
        },
      ];

      const mockLimit = vi
        .fn()
        .mockResolvedValue({ data: mockPendingItems, error: null });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockLte = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqSelect = vi.fn().mockReturnValue({ lte: mockLte });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      vi.mocked(supabaseAdmin).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          update: mockUpdate,
        }),
      } as never);

      vi.mocked(refreshProfile).mockResolvedValue({
        status: 'rate_limited',
        retryAfterSeconds: 600,
      });

      const stats = await processDeadLetterQueue(10);

      expect(stats).toEqual({
        processed: 1,
        succeeded: 0,
        failed: 0,
        retried: 1,
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          retry_count: 2,
        }),
      );
    });
  });
});
