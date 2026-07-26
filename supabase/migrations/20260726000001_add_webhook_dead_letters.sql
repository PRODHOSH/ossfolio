-- Dead-letter queue table for unhandled/failed GitHub webhook payload events.
-- When background profile refresh operations encounter transient locks or errors,
-- the payload and metadata are saved here for scheduled retry processing.

create table if not exists public.webhook_dead_letter_queue (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,
  username      text not null,
  payload       jsonb not null default '{}'::jsonb,
  error_reason  text,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  retry_count   integer not null default 0,
  max_retries   integer not null default 5,
  received_at   timestamptz not null default now(),
  last_retry_at timestamptz,
  next_retry_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.webhook_dead_letter_queue is
  'Dead-letter retry queue recording unhandled payload timestamps and events for background retry execution.';

-- Index for fetching retriable dead letter items efficiently
create index if not exists idx_webhook_dead_letters_retry
  on public.webhook_dead_letter_queue (status, next_retry_at)
  where status = 'pending';

-- Index by username for troubleshooting and profile lookups
create index if not exists idx_webhook_dead_letters_username
  on public.webhook_dead_letter_queue (username);

-- Enable RLS without public policies (service role full access)
alter table public.webhook_dead_letter_queue enable row level security;
