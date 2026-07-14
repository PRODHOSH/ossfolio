# Security Configuration

## Content Security Policy (CSP)

CSP headers are applied via Next.js middleware for page routes and inline headers for API routes.

### Page Routes

- `script-src`: Inline scripts allowed (for Google Analytics and theme injection)
- `style-src`: Inline styles allowed (for CSS-in-JS and design system variables)
- `img-src`: GitHub avatars, data URIs, and same-origin
- `connect-src`: Supabase, GitHub API, self
- `frame-ancestors`: `'none'`

### API Routes

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Cross-Origin Resource Sharing (CORS)

- Public endpoints (`/api/v1/users/[username]`) allow all origins
- Authenticated endpoints reflect the requesting origin
- Credentials not required for public endpoints

## Rate Limiting

| Endpoint | Limit | Window | Backend |
|----------|-------|--------|---------|
| `/api/[username]/refresh` | 1 request | 5 minutes | Upstash Redis (per IP) |
| `/api/v1/users/[username]` | 60 requests | 1 minute | In-memory (per IP) |
| Profile sync (per user) | 1 request | 10 minutes | Supabase DB |

## Authentication

- **GitHub OAuth**: Via Supabase (PKCE flow)
- **Service Role**: Used for admin operations (profile sync)
- **Webhook**: Verified via GitHub HMAC signature

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Admin key for server-side ops |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token for rate limiting |
