-- Anomaly detection flags for scoring abuse (see src/lib/anomaly.ts).
-- flagged      : set when the ratio heuristic detects likely score gaming (e.g. empty-commit spam).
-- flag_reason  : human-readable justification, so a flag is auditable and reversible.
-- flagged_at   : when the flag was last applied.
-- A flagged account keeps its profile; its stored score is discounted at sync time.

alter table public.profiles
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists flagged_at timestamptz;

-- Partial index: only flagged rows are indexed, since that is the set moderation
-- (and a future "hide flagged profiles" pass) will need to look up.
create index if not exists idx_profiles_flagged
  on public.profiles (flagged)
  where flagged;
