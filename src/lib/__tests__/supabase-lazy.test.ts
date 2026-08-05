import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClientMock = vi.fn((url: string, key: string) => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
  url,
  key,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: [string, string]) => createClientMock(...args),
}));

import {
  getSupabase,
  supabase,
  supabaseAdmin,
  resetSupabaseClientForTesting,
  resetSupabaseAdminClientForTesting,
} from '../supabase';

describe('Lazy Supabase Client Initialization', () => {
  beforeEach(() => {
    resetSupabaseClientForTesting();
    resetSupabaseAdminClientForTesting();
    createClientMock.mockClear();
  });

  it('should not instantiate createClient upon module import', () => {
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('should lazily instantiate createClient on getSupabase() invocation', () => {
    expect(createClientMock).not.toHaveBeenCalled();
    const client = getSupabase();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(client).toBeDefined();

    // Repeated call reuses cached client instance
    getSupabase();
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('should trigger lazy client creation upon Proxy property access', () => {
    expect(createClientMock).not.toHaveBeenCalled();
    // Accessing property on the proxy triggers getSupabase()
    const _fromFn = supabase.from;
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(_fromFn).toBeDefined();
  });

  it('should lazily instantiate and cache client in supabaseAdmin()', () => {
    expect(createClientMock).not.toHaveBeenCalled();
    const client1 = supabaseAdmin();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    const lastCall = createClientMock.mock.calls[0];
    expect(lastCall[1]).toBe('placeholder-service-key');

    // Repeated call reuses cached admin client instance
    const client2 = supabaseAdmin();
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(client2).toBe(client1);
  });
});
