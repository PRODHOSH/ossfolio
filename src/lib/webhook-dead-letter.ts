import { supabaseAdmin } from '@/lib/supabase';
import { refreshProfile } from '@/lib/refresh-profile';

export interface DeadLetterPayloadInput {
  eventType: string;
  username: string;
  payload: unknown;
  errorReason?: string;
}

export interface DeadLetterProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
}

export interface WebhookDeadLetterRow {
  id: string;
  event_type: string;
  username: string;
  payload: unknown;
  error_reason: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  received_at: string;
  last_retry_at: string | null;
  next_retry_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Enqueues a failed or rate-limited webhook event into the Postgres dead-letter queue table.
 */
export async function enqueueDeadLetterPayload(
  input: DeadLetterPayloadInput,
): Promise<{ success: boolean; id?: string; error?: unknown }> {
  try {
    const adminClient = supabaseAdmin();
    const now = new Date().toISOString();

    const { data, error } = await adminClient
      .from('webhook_dead_letter_queue')
      .insert({
        event_type: input.eventType,
        username: input.username,
        payload: input.payload ?? {},
        error_reason: input.errorReason ?? 'transient_write_failure',
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        received_at: now,
        next_retry_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[webhook-dead-letter] Insert error:', error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[webhook-dead-letter] Failed to enqueue dead letter:', err);
    return { success: false, error: err };
  }
}

/**
 * Processes due items in the webhook dead-letter queue.
 */
export async function processDeadLetterQueue(
  batchSize = 10,
): Promise<DeadLetterProcessResult> {
  const result: DeadLetterProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
  };

  try {
    const adminClient = supabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: items, error: fetchError } = await adminClient
      .from('webhook_dead_letter_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', nowIso)
      .order('next_retry_at', { ascending: true })
      .limit(batchSize);

    if (fetchError || !items || items.length === 0) {
      return result;
    }

    for (const item of items as WebhookDeadLetterRow[]) {
      const currentNow = new Date().toISOString();

      // Atomically lock row from pending -> processing to prevent race conditions
      const { data: lockData, error: lockError } = await adminClient
        .from('webhook_dead_letter_queue')
        .update({
          status: 'processing',
          last_retry_at: currentNow,
          updated_at: currentNow,
        })
        .eq('id', item.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (lockError || !lockData) {
        // Row was already claimed/processed by another concurrent worker
        continue;
      }

      result.processed++;

      const refreshRes = await refreshProfile(item.username);

      if (refreshRes.status === 'refreshed') {
        const finishNow = new Date().toISOString();
        await adminClient
          .from('webhook_dead_letter_queue')
          .update({
            status: 'completed',
            updated_at: finishNow,
          })
          .eq('id', item.id);
        result.succeeded++;
      } else {
        const nextRetryCount = item.retry_count + 1;
        const finishNow = new Date().toISOString();

        if (nextRetryCount >= item.max_retries) {
          await adminClient
            .from('webhook_dead_letter_queue')
            .update({
              status: 'failed',
              retry_count: nextRetryCount,
              error_reason: `max_retries_exceeded: ${String(refreshRes.status)}`,
              updated_at: finishNow,
            })
            .eq('id', item.id);
          result.failed++;
        } else {
          // Exponential backoff: 5m, 10m, 20m, 40m...
          const backoffMinutes = Math.pow(2, nextRetryCount - 1) * 5;
          const nextRetryDate = new Date(
            Date.now() + backoffMinutes * 60 * 1000,
          ).toISOString();

          await adminClient
            .from('webhook_dead_letter_queue')
            .update({
              status: 'pending',
              retry_count: nextRetryCount,
              next_retry_at: nextRetryDate,
              error_reason: `retry_scheduled: ${String(refreshRes.status)}`,
              updated_at: finishNow,
            })
            .eq('id', item.id);
          result.retried++;
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[webhook-dead-letter] Queue processing failed:', err);
    return result;
  }
}
