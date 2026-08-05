import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

// Wrap the Redis client in a lazy-evaluated Proxy.
// This prevents Next.js / CI build-time crashes if environment variables are
// missing during static analysis by deferring initialization until runtime execution.
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Safe Fallback Mock: If credentials are missing, return harmless mock resolvers.
    if (!url || !token) {
      if (prop === 'get') return async () => null;
      if (prop === 'set') return async () => 'OK';
      // Catch-all safe default for any other Redis method calls
      return async () => null;
    }

    // Lazily initialize the real Upstash client on first use
    if (!redisClient) {
      redisClient = new Redis({ url, token });
    }

    const value = (redisClient as Record<string | symbol, any>)[prop];
    return typeof value === 'function' ? value.bind(redisClient) : value;
  },
});
