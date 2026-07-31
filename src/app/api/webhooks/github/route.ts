import { NextRequest, after } from 'next/server';
import {
  sanitizeUsername,
  createApiResponse,
  createErrorResponse,
} from '@/lib/validators/api';
import { refreshProfile } from '@/lib/refresh-profile';
import { enqueueDeadLetterPayload } from '@/lib/webhook-dead-letter';

import { verifySignature } from '@/lib/webhook-signature';

/** The subset of GitHub's push event this route reads. */
interface PushPayload {
  repository?: { owner?: { login?: string; name?: string } };
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a configured secret nothing can be verified.
    return createErrorResponse('Webhook not configured', 503);
  }

  // The raw body is required — re-serializing parsed JSON would change bytes and
  // break the HMAC.
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!(await verifySignature(secret, body, signature))) {
    return createErrorResponse('Invalid signature', 401);
  }

  const event = request.headers.get('x-github-event');
  if (event === 'ping') {
    return createApiResponse({ ok: true, message: 'pong' });
  }
  if (event !== 'push') {
    // Acknowledge other events so GitHub doesn't retry them.
    return createApiResponse({ ok: true, ignored: event ?? 'unknown' });
  }

  let owner: string | undefined;
  let parsedPayload: PushPayload | undefined;
  try {
    parsedPayload = JSON.parse(body) as PushPayload;
    owner =
      parsedPayload.repository?.owner?.login ??
      parsedPayload.repository?.owner?.name;
  } catch {
    return createErrorResponse('Invalid JSON payload', 400);
  }

  const username = sanitizeUsername(owner);
  if (!username) {
    return createApiResponse({ ok: true, ignored: 'no repository owner' });
  }

  // Respond fast; run refresh and enqueue to dead-letter queue if transient write locks occur.
  after(async () => {
    try {
      const res = await refreshProfile(username);
      if (res.status === 'error' || res.status === 'rate_limited') {
        await enqueueDeadLetterPayload({
          eventType: event ?? 'push',
          username,
          payload: parsedPayload ?? { owner },
          errorReason: `refresh_status_${res.status}`,
        });
      }
    } catch (err) {
      console.error('GitHub webhook: background refresh failed', {
        username,
        err,
      });
      await enqueueDeadLetterPayload({
        eventType: event ?? 'push',
        username,
        payload: parsedPayload ?? { owner },
        errorReason: err instanceof Error ? err.message : 'unknown_error',
      });
    }
  });

  return createApiResponse({ ok: true, accepted: username });
}
