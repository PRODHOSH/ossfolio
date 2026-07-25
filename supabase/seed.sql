-- Seed data for local development.
-- Runs automatically with: supabase db reset
--
-- Why this inserts into auth.users rather than public.profiles
-- ------------------------------------------------------------
-- `profiles.id` is `references auth.users(id) on delete cascade`, so a profile row cannot exist
-- without an auth user — inserting straight into `public.profiles` fails on the foreign key. The
-- `handle_new_user` trigger already builds the profile from an inserted auth user's
-- `raw_user_meta_data`, so this seed does what a real GitHub sign-in does: create the auth user with
-- GitHub-shaped metadata and let the trigger produce the profile. That also keeps the file honest —
-- if the trigger changes, the seed follows it rather than drifting into a second, parallel
-- definition of what a profile looks like.
--
-- Stats are then filled in with an UPDATE, because the trigger only sets identity fields (username,
-- name, avatar_url, github_url). Score and totals normally arrive from the GitHub sync, which needs
-- a service-role key and network access that local dev often doesn't have.
--
-- The previous version of this file said no seed data was needed, since profiles are created on
-- sign-up. That's true, and it leaves anyone without GitHub OAuth configured — or without a Supabase
-- project at all — looking at an empty Explore, an empty Discover, and a /compare with nobody to
-- compare. This gives them something to develop against.
--
-- Sign-in
-- -------
-- Each seeded user also gets a row in `auth.identities`. Without one, GoTrue will not authenticate
-- them: the account exists, shows up on Explore, and simply cannot be logged into — which would make
-- this file useful for looking at and useless for testing anything behind auth.
--
-- The identities use the `email` provider rather than `github`, because a GitHub identity cannot be
-- seeded honestly — there is no real OAuth grant behind it. AuthModal offers
-- `signInWithPassword` alongside GitHub OAuth, so an email identity means these accounts sign in
-- through the app's own UI:
--
--     ada@example.dev / password123     (same password for all five)
--
-- That's what makes /settings, the visibility toggle and account deletion testable locally without
-- configuring GitHub OAuth at all.
--
-- `raw_user_meta_data` still carries GitHub-shaped fields, because that is what handle_new_user()
-- reads to build the profile. The two are different things: app_meta records how the user
-- authenticates, user_meta records who they are.
--
-- Idempotent: `on conflict do nothing` throughout, so `supabase db reset` can be run repeatedly.

-- ---------------------------------------------------------------------------------------------
-- Auth users. The trigger on auth.users creates the matching public.profiles row.
-- `raw_user_meta_data` mirrors the shape Supabase stores for a GitHub OAuth sign-in, because that is
-- exactly what handle_new_user() reads: user_name, full_name, avatar_url, html_url.
-- ---------------------------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'ada@example.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now() - interval '400 days',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_name":"ada-dev","full_name":"Ada Rivera","avatar_url":"https://avatars.githubusercontent.com/u/1?v=4","html_url":"https://github.com/ada-dev"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'kenji@example.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now() - interval '300 days',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_name":"kenji-builds","full_name":"Kenji Watanabe","avatar_url":"https://avatars.githubusercontent.com/u/2?v=4","html_url":"https://github.com/kenji-builds"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'priya@example.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now() - interval '200 days',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_name":"priya-codes","full_name":"Priya Nair","avatar_url":"https://avatars.githubusercontent.com/u/3?v=4","html_url":"https://github.com/priya-codes"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'tomas@example.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now() - interval '120 days',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_name":"tomas-oss","full_name":"Tomás Herrera","avatar_url":"https://avatars.githubusercontent.com/u/4?v=4","html_url":"https://github.com/tomas-oss"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'lena@example.dev',
    crypt('password123', gen_salt('bf')),
    now(),
    now() - interval '30 days',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"user_name":"lena-ships","full_name":"Lena Novak","avatar_url":"https://avatars.githubusercontent.com/u/5?v=4","html_url":"https://github.com/lena-ships"}'::jsonb
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Identities.
--
-- GoTrue resolves a login through `auth.identities`, not `auth.users` — a user row on its own cannot
-- be signed into. `identity_data` must carry `sub` (the user's id); GoTrue reads it back out, and a
-- missing `sub` produces an authentication failure that gives no hint as to why.
--
-- `provider_id` is the user id for the email provider, and (provider, provider_id) is unique — which
-- is also what makes the conflict guard below work.
-- ---------------------------------------------------------------------------------------------
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"ada@example.dev","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '11111111-1111-1111-1111-111111111111',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"kenji@example.dev","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '22222222-2222-2222-2222-222222222222',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"priya@example.dev","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '33333333-3333-3333-3333-333333333333',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"tomas@example.dev","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '44444444-4444-4444-4444-444444444444',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555',
    '{"sub":"55555555-5555-5555-5555-555555555555","email":"lena@example.dev","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    '55555555-5555-5555-5555-555555555555',
    now(),
    now(),
    now()
  )
on conflict (provider, provider_id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Stats.
--
-- The trigger only sets identity fields, so without this every seeded profile scores 0 and Explore
-- looks broken rather than empty. The spread is deliberate: a clear top of the leaderboard, a long
-- tail, one large positive `score_delta_30_days` and one negative (so the "most improved" sort added
-- in 20260710000000 has something to sort), and languages that overlap enough for the Discover
-- language filter to be worth clicking.
-- ---------------------------------------------------------------------------------------------
update public.profiles set
  bio                 = 'Compilers, type systems, and the occasional yak shave.',
  score               = 2840,
  total_prs           = 412,
  total_commits       = 3180,
  total_issues        = 96,
  total_reviews       = 271,
  followers           = 1840,
  top_languages       = array['Rust', 'TypeScript', 'C++'],
  score_delta_30_days = 120,
  visibility          = 'public'
where username = 'ada-dev';

update public.profiles set
  bio                 = 'Distributed systems. Mostly Go, occasionally regretful.',
  score               = 1960,
  total_prs           = 288,
  total_commits       = 2410,
  total_issues        = 74,
  total_reviews       = 190,
  followers           = 920,
  top_languages       = array['Go', 'Python', 'TypeScript'],
  score_delta_30_days = -35,
  visibility          = 'public'
where username = 'kenji-builds';

update public.profiles set
  bio                 = 'Frontend infrastructure and accessibility.',
  score               = 1475,
  total_prs           = 203,
  total_commits       = 1690,
  total_issues        = 118,
  total_reviews       = 142,
  followers           = 640,
  top_languages       = array['TypeScript', 'JavaScript', 'CSS'],
  score_delta_30_days = 310,
  visibility          = 'public'
where username = 'priya-codes';

update public.profiles set
  bio                 = 'Data pipelines, mostly Python. Learning Rust slowly.',
  score               = 720,
  total_prs           = 94,
  total_commits       = 810,
  total_issues        = 41,
  total_reviews       = 38,
  followers           = 180,
  top_languages       = array['Python', 'SQL', 'Rust'],
  score_delta_30_days = 65,
  visibility          = 'public'
where username = 'tomas-oss';

-- Deliberately unlisted: renders at /lena-ships, but must not appear on Explore or in
-- /api/discover. Easy to break, hard to notice without an example sitting in the database.
update public.profiles set
  bio                 = 'Quietly shipping things.',
  score               = 1120,
  total_prs           = 151,
  total_commits       = 1240,
  total_issues        = 29,
  total_reviews       = 88,
  followers           = 310,
  top_languages       = array['TypeScript', 'Go'],
  score_delta_30_days = 40,
  visibility          = 'unlisted'
where username = 'lena-ships';
