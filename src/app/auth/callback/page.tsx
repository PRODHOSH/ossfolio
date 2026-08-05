'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Cap how long the post-login score sync may delay the redirect. The sync is
// best-effort (the profile page recomputes the score live as a fallback), so a
// slow GitHub/Supabase response must never hold the user on this screen.
const SYNC_TIMEOUT_MS = 4000;

// Maximum time to wait for the PKCE code exchange before giving up and
// redirecting home. Prevents infinite "Signing you in…" spinner.
const AUTH_WAIT_TIMEOUT_MS = 10000;

/**
 * Ask the server to recompute and store this account's score.
 *
 * This used to happen right here in the browser: it fetched from GitHub, scored the
 * account, and upserted `profiles` with the anon key. That is what made `score`,
 * `total_*` and the anti-gaming `flagged` column client-writable (see #409) — the anon
 * key ships in the browser bundle, so any signed-in user could simply PATCH their own
 * score and clear their own flag.
 *
 * The scoring now happens on the server, keyed to the *verified* access token, and is
 * written with the service-role key. The browser no longer computes, sends, or is
 * permitted to write any of those columns.
 */
async function requestScoreSync(
  accessToken: string,
  providerToken?: string,
): Promise<void> {
  const res = await fetch('/api/profile/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    // The GitHub OAuth token only widens the rate limit for this user's own lookup; the
    // server takes the identity being scored from the session, not from this body.
    body: JSON.stringify({ providerToken }),
  });

  if (!res.ok) {
    console.error('Score sync failed:', res.status);
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function handleSession(session: Session) {
      const username = session.user.user_metadata?.user_name as
        string | undefined;
      // provider_token is only present immediately after the OAuth redirect.
      const providerToken = session.provider_token ?? undefined;

      if (username && session.access_token) {
        await Promise.race([
          requestScoreSync(session.access_token, providerToken).catch(() => {}),
          new Promise<void>((resolve) => setTimeout(resolve, SYNC_TIMEOUT_MS)),
        ]);
      }

      if (!cancelled) {
        router.replace(username ? `/${username}` : '/');
      }
    }

    // With PKCE flow (Supabase v2 default), the ?code= in the callback URL is
    // exchanged asynchronously during client initialization. getSession() can
    // return null before that exchange completes, so we listen for SIGNED_IN
    // instead, which fires only after the exchange succeeds and the session is
    // stored. We also fall back to INITIAL_SESSION in case the session was
    // already established before the listener attached (e.g., rapid re-mount).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled || !session) return;
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await handleSession(session);
      }
    });

    // Safety net: if no auth event arrives within AUTH_WAIT_TIMEOUT_MS, redirect
    // home so the user isn't stuck on the spinner indefinitely.
    const timeout = setTimeout(() => {
      if (!cancelled) router.replace('/');
    }, AUTH_WAIT_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      <p style={{ color: '#707070', fontSize: '14px' }}>Signing you in…</p>
    </div>
  );
}
