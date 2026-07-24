# Architecture

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase
- **Testing:** Playwright, Vitest

## Directory Structure
- /src: Contains the main application source code (components, app router, lib).
- /public: Static assets.
- /supabase: Supabase configuration and migrations.
- /e2e: End-to-end tests.

## Data Flow
1. Users interact with the React frontend.
2. Data fetching occurs via Next.js server components or API routes.
3. Backend queries Supabase or GitHub APIs to fetch required data.
4. Responses are sent back and rendered on the client.

## External Services
- **GitHub API:** Used for authentication and fetching repository data.
- **Supabase:** Used as the primary database for user data and state.

