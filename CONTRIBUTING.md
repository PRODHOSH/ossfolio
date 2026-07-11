# Contributing to OSSfolio

Thank you for taking the time to contribute. OSSfolio is built entirely by contributors like you — every PR, issue, and discussion makes it better.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [AI Policy](#ai-policy)
- [How Can I Contribute?](#how-can-i-contribute)
- [Design System](#design-system)
- [Local Setup](#local-setup)
  - [1. Fork and clone](#1-fork-and-clone)
  - [2. Install dependencies](#2-install-dependencies)
  - [3. Set up the database](#3-set-up-the-database)
  - [4. Environment variables](#4-environment-variables)
  - [5. Run the dev server](#5-run-the-dev-server)
- [Database — Making Schema Changes](#database--making-schema-changes)
- [How Key Systems Work](#how-key-systems-work)
  - [Auth Flow](#auth-flow)
  - [Score Sync Pipeline](#score-sync-pipeline)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Good First Issues](#good-first-issues)
- [Questions](#questions)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## AI Policy

We are not saying do not use AI. Use it, but use it responsibly.

If you used AI to help write or fix code, that is completely fine. But you need to follow these rules:

**Mention it clearly.** In your PR description, add a line like: "Used Claude Code for coding" or whichever tool you used. This is not optional.

**Actually understand what you changed.** Before submitting, you should be able to answer these three questions yourself:
- Which function or module did you change?
- Why did you change it?
- What side effects could that change create?

If you cannot answer those, do not submit yet. Go back, understand the code, then submit.

**Write your own PR and issue descriptions.** Your PR description and issue messages need to be in your own words. Do not paste AI-generated summaries as your contribution message. These should reflect your actual understanding of the change, not a model's summary of it.

**No spam.** AI-generated issues, copy-paste PRs, or vague "fix bug" contributions with no real understanding behind them will be closed without review. Quality matters more than speed here.

---

## How Can I Contribute?

### Fix a bug
Open issues labelled [`bug`](../../issues?q=label%3Abug+is%3Aopen). Comment to claim one before starting.

### Build a feature
Open issues labelled [`enhancement`](../../issues?q=label%3Aenhancement+is%3Aopen). Comment explaining your approach and wait to be assigned.

### Improve docs
Typos, unclear sections, missing info — no issue needed for small doc fixes. Just open a PR.

### Report a bug
Open an issue using the **Bug Report** template. Include steps to reproduce, expected behaviour, and screenshots if relevant.

### Suggest a feature
Open an issue using the **Feature Request** template. Describe the problem it solves, not just what you want built.

---

## Design System

OSSfolio has a design system documented in [`DESIGN.md`](DESIGN.md). If your contribution touches any UI — a new component, a page section, buttons, colors, spacing, typography — you need to read it before you start coding.

It covers:
- Color tokens (primary green, ink, canvas, hairline values)
- Typography scale and font weights
- Spacing and border radius values
- Button, card, input, and nav component specs
- What to do and what not to do

Following it keeps the UI consistent across contributions. PRs that introduce new colors, fonts, or spacing outside the design system will be asked to revise.

---

## Local Setup

### 1. Fork and clone

Fork the repo on GitHub, then clone your fork:

```bash
git clone https://github.com/prodhosh/ossfolio.git
cd ossfolio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

OSSfolio uses [Supabase](https://supabase.com) (PostgreSQL) as its backend — it provides the database, authentication, and API. Pick whichever option works for you.

---

#### Option A — Supabase Dashboard (easiest, no extra tools)

This is the recommended path for most contributors.

1. Create a free project at [supabase.com](https://supabase.com)
2. In your project, go to **SQL Editor → New query**
3. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo
4. Copy the entire contents, paste into the editor, and click **Run**
5. All tables and row-level security policies are created — you're done

---

#### Option B — Supabase CLI (local Docker)

> **Note:** This option requires [Docker](https://www.docker.com) to be installed and running on your machine before you begin.

Use this if you want a fully local setup without a cloud Supabase project.

```bash
# Install the Supabase CLI
npm install -g supabase

# Start a local Supabase instance
supabase start

# Apply all migrations and load sample seed data
supabase db reset
```

`supabase db reset` runs every file inside `supabase/migrations/` in timestamp order, then runs `supabase/seed.sql` to load sample data. Your local database is fully ready.

The CLI will print your local project URL and anon key — use those in `.env.local`.

---

### 4. Environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → **Project API keys** → `anon` `public` (this is a safe, public key used to access Supabase from the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in your terminal |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |

GitHub OAuth is configured directly inside Supabase — go to **Authentication → Providers → GitHub** in your Supabase dashboard and enter your GitHub OAuth app credentials there. You do not need to add them to `.env.local`.

---

### 5. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Database — Making Schema Changes

The database schema lives in two places that are always kept in sync:

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Single master file — paste this into Supabase dashboard to set up everything at once |
| `supabase/migrations/` | Individual migration files — used by the Supabase CLI, one file per change |

### If your PR changes the database schema

**Do not edit existing migration files.** They are immutable once merged — changing them breaks other contributors' local setups.

Instead, create a new migration file:

```bash
supabase migration new describe_your_change
```

This creates `supabase/migrations/<timestamp>_describe_your_change.sql`. Write your SQL there.

Then update `supabase/schema.sql` to reflect the change so dashboard users stay in sync. Both files must be included in your PR.

Reviewers will check the SQL diff before merging.

---

## How Key Systems Work

This section explains how the two most complex systems in the codebase operate: the Supabase authentication flow and the contributor score synchronization pipeline.

### Auth Flow

OSSfolio uses GitHub OAuth integrated with Supabase for user authentication.

#### End-to-End OAuth Lifecycle
1. **Initiation**: The user clicks "Sign in with GitHub" in the frontend (e.g., [AuthModal.tsx](file:///c:/Users/Rushabh%20Mahajan/Documents/GitHub/ossfolio/src/components/auth/AuthModal.tsx)).
2. **Supabase Redirection**: Supabase redirects the browser to GitHub's OAuth server.
3. **GitHub Authentication**: The user authorizes the application, and GitHub redirects back to the configured callback URI: `/auth/callback`.
4. **Session Resolution**: The client component at [auth/callback/page.tsx](file:///c:/Users/Rushabh%20Mahajan/Documents/GitHub/ossfolio/src/app/auth/callback/page.tsx) handles the login session.
5. **Score Sync Trigger**: Once the session is successfully resolved, the score sync pipeline is invoked to calculate and cache the user's score.
6. **Final Redirect**: The user is redirected to their public profile page (`/[username]`) or the home page (`/`) if the username metadata is missing.

#### PKCE Flow & Client Initialization
- **What is PKCE?**: OSSfolio uses the standard **PKCE (Proof Key for Code Exchange)** OAuth flow (default in Supabase v2). Under PKCE, the authorization code (`?code=...`) in the callback URL is exchanged client-side for an access and refresh token.
- **Asynchronous Execution**: This code exchange happens asynchronously during the Supabase client library's initialization.
- **`onAuthStateChange` vs `getSession`**: Because the exchange is asynchronous, calling `supabase.auth.getSession()` immediately upon page load can return `null` before the exchange completes. To prevent race conditions, the callback page subscribes to auth state changes using `supabase.auth.onAuthStateChange`. It listens for `SIGNED_IN` and `INITIAL_SESSION` events to ensure that the session is established and active before executing the score sync.
- **Safety Net**: A safety timeout (`AUTH_WAIT_TIMEOUT_MS = 10000`) is established to redirect the user back to the home page if the PKCE exchange fails or hangs.

### Score Sync Pipeline

The score sync pipeline calculates the user's contributor score by pulling activity data from GitHub and caching it in the database.

#### Recalculation Timing
1. **At Login**: Calculated and stored automatically during the post-login OAuth callback phase.
2. **On-Demand**: Regenerated when a user clicks the profile refresh/sync action (which hits `/api/[username]/refresh` endpoint).
3. **Timeout Constraint**: During the OAuth callback, the `syncScore` pipeline is raced against a 4-second timeout (`SYNC_TIMEOUT_MS = 4000`) to guarantee that slow API requests do not block the user from accessing their profile.

#### GraphQL vs REST Fallback Path
When syncing the score, the application checks for the user's GitHub provider token (saved immediately after OAuth login):
- **GraphQL Path (Authenticated)**: If `providerToken` is available, it queries the GitHub GraphQL API using `fetchContributorProfile`. The GraphQL API exposes the `contributionsCollection` query, which is the only source that returns the user's Pull Request review counts (`totalPullRequestReviewContributions`).
- **REST Path (Unauthenticated Fallback)**: If the token is missing or if the GraphQL query fails (due to rate limits, expired tokens, or scope issues), the pipeline falls back to `statsFromRest(username)`. This runs three parallel REST Search API requests (`fetchLiveStats(username)`) to retrieve PR, issue, and commit counts. Because code review counts cannot be retrieved from unauthenticated REST or search APIs, the `totalReviews` count defaults to `0` in this fallback path.

For full architectural flows and sequence diagrams of these pipelines, consult the [System Flow Diagrams](docs/system-diagrams.md) and [API Reference Architecture](docs/api-reference-architecture.md).

#### Database Profile Schema
The calculated score and activity stats are cached in the `public.profiles` database table. The table columns are:
- `id` (uuid, primary key): References `auth.users(id)` in Supabase auth system.
- `username` (text, unique): User's GitHub login handle.
- `name` (text): Display name.
- `avatar_url` (text): GitHub avatar image URL.
- `github_url` (text): Link to the user's GitHub profile.
- `bio` (text): Self-written bio.
- `followers` (integer): Number of GitHub followers.
- `top_languages` (text[]): Array of top programming languages used by the user.
- `score` (integer): Computed contributor score.
- `total_commits` (integer): Total commit count.
- `total_prs` (integer): Total PR count.
- `total_issues` (integer): Total issue count.
- `total_reviews` (integer): Total pull request review count (only populated/updated in the GraphQL sync path).
- `badges` (jsonb): JSON array of claimant badge configurations.
- `headline` (text): Custom profile headline text.
- `pinned_repos` (text[]): List of pinned repository names.
- `custom_links` (jsonb): User's custom profile links.
- `visibility` (text): Visibility state (`public` or `unlisted`).
- `search_text` (tsvector): Automatically updated English search vector for full-text profile search.
- `created_at` / `updated_at` (timestamptz): Creation and modification timestamps.
- `view_count` (integer): Count of user profile views.
- `last_refreshed_at` (timestamptz): Time of the last profile sync.

---

## Branch Naming

Use the format `type/short-description`:

| Prefix | When to use |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code cleanup, no behaviour change |
| `chore/` | Tooling, CI, config |
| `test/` | Tests only |

Examples: `feat/contribution-heatmap`, `fix/github-api-rate-limit`, `docs/supabase-setup`

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short summary under 72 chars
```

Examples:
- `feat(profile): add merged PR count display`
- `fix(api): handle GitHub rate limit gracefully`
- `docs(contributing): clarify supabase setup options`
- `chore(db): add leaderboard migration`

---

## Pull Request Process

**Please do not submit a PR without first being assigned to the issue.** Comment on the issue with your approach, wait to get assigned, then start working. Once you are assigned, feel free to prepare your PR.

**You must use the PR template.** When you open a PR on GitHub, the description field is pre-filled with our template automatically. Do not delete it or replace it with your own format. Fill it out completely. PRs that skip the template or leave sections blank will be closed and asked to re-submit.

Once you submit a PR, it will be reviewed within 12 hours. Please be patient and avoid pinging or sending repeated messages asking for a review before that time. You can send one follow-up message after 12 hours, but keep it to that.

### Steps

1. Make sure your branch is up to date with `main`
2. Fill out the PR template completely — incomplete PRs may be closed
3. Link the issue using `Closes #<issue-number>` in the PR description
4. Write your PR description in your own words — describe what you changed and why, not just what the diff shows
5. If you used AI for any part of the code, mention it clearly in the description
6. One logical change per PR — don't bundle unrelated fixes
7. All PRs need at least one review before merge
8. A maintainer will merge once approved

### PR Checklist

- [ ] I was assigned to the issue before opening this PR
- [ ] Code works locally
- [ ] No `console.log` left in `src/`
- [ ] If schema changed — both `schema.sql` and a new migration file are included
- [ ] Docs updated if needed
- [ ] PR title follows Conventional Commits format
- [ ] PR description is written in my own words
- [ ] If I used AI for coding, I mentioned it clearly and I understand every change I made

---

## Issue Guidelines

- **Check for duplicates first.** Before opening an issue, search the existing open issues to see if someone already reported it. Duplicate issues will be closed.
- **Use the correct template.** Pick Bug Report, Feature Request, Good First Issue, or Docs depending on what you are filing.
- **Be specific.** Vague issues are hard to act on and will be asked for more detail or closed.
- **No spam.** Do not open issues just to get assigned to something without a clear problem statement.
- If you want to work on an issue you opened yourself, say so in the issue and wait to be assigned like everyone else.

---

## Good First Issues

New to open source? Start here:

- [`good first issue`](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — beginner-friendly tasks with clear scope
- [`documentation`](../../issues?q=is%3Aissue+is%3Aopen+label%3Adocumentation) — great entry point if you're not ready to touch code yet

Not sure where to start? Open a [Discussion](../../discussions) and ask — we'll help you find something.

---

## Additional Resources

Before diving into code, reviewing these documents can save you time:

- [Architecture Overview](docs/architecture-overview.md) — System design, data flow, theming
- [API Reference](docs/api-reference.md) — All internal API endpoints, params, and errors
- [DESIGN.md](DESIGN.md) — Visual design tokens, component specs, spacing
- [Database Schema](supabase/schema.sql) — Tables, policies, and search functions

## Questions?

If you have any doubts, feel free to reach out. Open a [Discussion](../../discussions) for general questions, or ping once on [LinkedIn](https://www.linkedin.com/in/prodhoshvs/). Please keep it to one message and give some time for a response before following up.
