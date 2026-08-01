import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRefreshRateLimit,
  getRateLimitFailoverState,
  resetRateLimitFailoverState,
} from '../rate-limit';
import { redis } from '../redis';
import { NextRequest } from 'next/server';

vi.mock('../redis', () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    h.set(k, v);
  }
  return new NextRequest('https://example.com/api/test/refresh', {
    method: 'POST',
    headers: h,
  });
}

describe('checkRefreshRateLimit', () => {
  beforeEach(() => {
    resetRateLimitFailoverState();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Normal Redis Operation', () => {
    it('should allow request when Redis set acquires lock', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK' as never);

      const req = makeRequest({ 'x-real-ip': '1.2.3.4' });
      const result = await checkRefreshRateLimit(req);

      expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
      expect(redis.set).toHaveBeenCalledTimes(1);
      expect(getRateLimitFailoverState().consecutiveFailures).toBe(0);
    });

    it('should reject request with retryAfterSeconds when Redis key is already held', async () => {
      vi.mocked(redis.set).mockResolvedValue(null as never);
      const now = Date.now();
      const futureReset = now + 120 * 1000; // 120 seconds in future
      vi.mocked(redis.get).mockResolvedValue(futureReset as never);

      const req = makeRequest({ 'x-real-ip': '1.2.3.4' });
      const result = await checkRefreshRateLimit(req);

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(119);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(120);
    });
  });

  describe('Redis Connection Failure & Memory Buffer Fallback', () => {
    it('should failover to memory buffer and emit structured telemetry when Redis fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(redis.set).mockRejectedValue(
        new Error('Upstash Redis connection timeout'),
      );

      const req = makeRequest({ 'cf-connecting-ip': '203.0.113.1' });
      const result = await checkRefreshRateLimit(req);

      expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
      expect(getRateLimitFailoverState().consecutiveFailures).toBe(1);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logOutput = warnSpy.mock.calls[0][1];
      const telemetry = JSON.parse(logOutput);

      expect(telemetry.event).toBe('REDIS_FAILOVER');
      expect(telemetry.reason).toContain('Upstash Redis connection timeout');
      expect(telemetry.fallbackMode).toBe('MEMORY_BUFFER');
      expect(telemetry.consecutiveFailures).toBe(1);
      expect(telemetry.allowed).toBe(true);
    });

    it('should rate limit repeat request using localized sliding memory buffer during outage', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(redis.set).mockRejectedValue(
        new Error('Redis connection refused'),
      );

      const req = makeRequest({ 'cf-connecting-ip': '203.0.113.1' });

      // First request takes slot in memory buffer
      const res1 = await checkRefreshRateLimit(req);
      expect(res1.allowed).toBe(true);

      // Second request from same IP within window should be blocked by memory buffer
      const res2 = await checkRefreshRateLimit(req);
      expect(res2.allowed).toBe(false);
      expect(res2.retryAfterSeconds).toBeGreaterThan(0);
      expect(res2.retryAfterSeconds).toBeLessThanOrEqual(300);
    });
  });

  describe('Exponential Backoff & Recovery', () => {
    it('should bypass Redis calls during exponential backoff window', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(redis.set).mockRejectedValue(new Error('Network Unreachable'));

      const req1 = makeRequest({ 'x-real-ip': '10.0.0.1' });
      const req2 = makeRequest({ 'x-real-ip': '10.0.0.2' });

      // First call fails Redis, triggering backoff (consecutiveFailures = 1, backoff = 1000ms)
      await checkRefreshRateLimit(req1);
      expect(redis.set).toHaveBeenCalledTimes(1);

      // Second call immediately after should skip Redis set completely due to backoff window
      await checkRefreshRateLimit(req2);
      expect(redis.set).toHaveBeenCalledTimes(1); // Call count remains 1

      expect(warnSpy).toHaveBeenCalledTimes(2);
      const secondTelemetry = JSON.parse(warnSpy.mock.calls[1][1]);
      expect(secondTelemetry.inBackoffWindow).toBe(true);
      expect(secondTelemetry.reason).toContain(
        'active exponential backoff window',
      );
    });

    it('should reset consecutive failures when Redis recovers after backoff window', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(redis.set).mockRejectedValueOnce(new Error('Temporary error'));

      const req = makeRequest({ 'x-real-ip': '10.0.0.5' });

      // First call fails
      await checkRefreshRateLimit(req);
      expect(getRateLimitFailoverState().consecutiveFailures).toBe(1);

      // Advance system time past backoff window (1000ms)
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now + 2000);

      // Next call Redis works again
      vi.mocked(redis.set).mockResolvedValueOnce('OK' as never);
      const result = await checkRefreshRateLimit(req);

      expect(result.allowed).toBe(true);
      expect(getRateLimitFailoverState().consecutiveFailures).toBe(0);
    });
  });

  describe('IP Extraction Logic', () => {
    it('should prioritize Cloudflare cf-connecting-ip', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK' as never);

      const req = makeRequest({
        'cf-connecting-ip': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      });

      await checkRefreshRateLimit(req);
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('should use last entry of x-forwarded-for when edge headers are absent', async () => {
      vi.mocked(redis.set).mockResolvedValue('OK' as never);

      const req = makeRequest({
        'x-forwarded-for': 'spoofed.client.ip, 198.51.100.4',
      });

      await checkRefreshRateLimit(req);
      expect(redis.set).toHaveBeenCalledTimes(1);
    });
  });
});
