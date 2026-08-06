# OSSfolio Public API Reference

The OSSfolio Public API lets you retrieve open-source contributor profile data
and scores programmatically. Use it to build badge widgets, integrations, or
personal dashboards.

**Base URL:** `https://ossfolio.com`  
**Version:** `v1`  
**Format:** All requests and responses are JSON.

---

## Authentication

Authentication is **optional** — the API is publicly readable. Providing an API
key unlocks a higher rate limit.

| Mode | Header | Rate limit |
|------|--------|-----------|
| Anonymous | *(none)* | 60 requests / minute / IP |
| Authenticated | `Authorization: Bearer osk_...` | 1 000 requests / minute / key |

### Generating a key

1. Sign in to OSSfolio.
2. Go to **Settings** → **Developer API**.
3. Enter a name for your key (e.g. `My Portfolio Widget`) and click **Create key**.
4. Copy the key immediately — it is shown **only once**. If you lose it, revoke it and create a new one.

Keys are prefixed with `osk_` (OSSfolio Secret Key) for easy identification in
logs and environment variables.

---

## Endpoints

### `GET /api/v1/users/:username`

Returns the public profile and open-source score for a registered user.

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | string | The user's GitHub username (case-insensitive) |

**Response shape**

```json
{
  "success": true,
  "data": {
    "username": "torvalds",
    "name": "Linus Torvalds",
    "avatar_url": "https://avatars.githubusercontent.com/u/1024025",
    "github_url": "https://github.com/torvalds",
    "bio": "Linux kernel developer",
    "headline": null,
    "score": 9420,
    "followers": 236000,
    "top_languages": ["C", "Python", "Shell"],
    "stats": {
      "commits": 15200,
      "prs": 48,
      "issues": 7,
      "reviews": 12
    },
    "badges": [],
    "last_refreshed_at": "2026-08-06T10:00:00Z"
  }
}
```

**Response headers**

| Header | Value |
|--------|-------|
| `Cache-Control` | `public, s-maxage=300, stale-while-revalidate=600` |
| `ETag` | Strong entity-tag for conditional requests |
| `X-RateLimit-Limit` | `60` (anonymous) or `1000` (authenticated) |
| `X-Auth-Type` | `anonymous` or `api-key` |

**Conditional requests**

The endpoint supports `If-None-Match`. Send the `ETag` value you received in
a previous response as `If-None-Match: "<etag>"`. You will receive `304 Not Modified`
(no body) if the profile has not changed since your last fetch.

---

## Error responses

All error responses share the same envelope:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Profile not found"
  },
  "status": 404,
  "timestamp": "2026-08-06T11:00:00.000Z"
}
```

| Status | `code` | Meaning |
|--------|--------|---------|
| `400` | `VALIDATION_ERROR` | Username format is invalid |
| `401` | `AUTH_ERROR` | API key is invalid, revoked, or malformed |
| `404` | `NOT_FOUND` | Username does not exist or the profile is private/unlisted |
| `429` | `RATE_LIMITED` | You have exceeded your rate limit |
| `502` | `UPSTREAM_ERROR` | Temporary database error — safe to retry |

On `429` responses the `Retry-After` response header tells you how many seconds
to wait before retrying, and the body includes a `retryAfterSeconds` field.

---

## Code examples

### curl (anonymous)

```bash
curl https://ossfolio.com/api/v1/users/torvalds
```

### curl (authenticated)

```bash
curl -H "Authorization: Bearer osk_YOUR_KEY_HERE" \
     https://ossfolio.com/api/v1/users/torvalds
```

### JavaScript (fetch)

```js
// Anonymous
const res = await fetch("https://ossfolio.com/api/v1/users/torvalds");
const { data } = await res.json();
console.log(data.score);

// Authenticated — store the key in an environment variable, never in client code
const res = await fetch("https://ossfolio.com/api/v1/users/torvalds", {
  headers: { Authorization: `Bearer ${process.env.OSSFOLIO_API_KEY}` },
});
```

### Python (requests)

```python
import os, requests

resp = requests.get(
    "https://ossfolio.com/api/v1/users/torvalds",
    headers={"Authorization": f"Bearer {os.environ['OSSFOLIO_API_KEY']}"},
)
data = resp.json()["data"]
print(data["score"])
```

### Embedding a score badge

The existing SVG badge endpoint does not require an API key:

```html
<img src="https://ossfolio.com/api/badge/torvalds" alt="OSSfolio Score" />
```

---

## Rate limit best practices

- Cache responses client-side for at least the `s-maxage` value (5 minutes).
- Honour the `ETag` / `If-None-Match` conditional request pattern to receive `304` responses for unchanged profiles at no rate-limit cost.
- If you receive a `429`, back off for at least the number of seconds in `Retry-After`.
- Store your API key in an environment variable — never commit it to source control.

---

## Key management API

The following endpoints manage your API keys. They require a valid **Supabase session JWT** (the token your browser holds after signing in), not an `osk_` key.

### `GET /api/settings/api-keys`

Lists your active (non-revoked) keys.

```bash
curl -H "Authorization: Bearer <supabase-jwt>" \
     https://ossfolio.com/api/settings/api-keys
```

### `POST /api/settings/api-keys`

Creates a new key. Body: `{ "name": "My Widget" }`. Returns the plaintext key once.

```bash
curl -X POST \
     -H "Authorization: Bearer <supabase-jwt>" \
     -H "Content-Type: application/json" \
     -d '{"name":"My Widget"}' \
     https://ossfolio.com/api/settings/api-keys
```

### `DELETE /api/settings/api-keys/:id`

Revokes the key with the given ID. The key is soft-deleted and immediately rejected on all subsequent requests.

```bash
curl -X DELETE \
     -H "Authorization: Bearer <supabase-jwt>" \
     https://ossfolio.com/api/settings/api-keys/KEY_UUID_HERE
```

---

## Security

- API keys are stored as SHA-256 hashes — the plaintext is never persisted.
- A revoked key is rejected within milliseconds; no caching delay.
- The API endpoint itself is read-only; no write operations are possible with an `osk_` key.
- Keys are scoped to a single user; one compromised key cannot access other users' settings.

To report a security vulnerability, see [SECURITY.md](./SECURITY.md).
