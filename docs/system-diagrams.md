# System Flow Diagrams

This file maps the data flows and integration touchpoints within OSSfolio.

## Database Schema Indexing Flow

```mermaid
sequenceDiagram
  participant Client
  participant DB as Supabase PostgreSQL
  participant Cache as Edge Cache
  Client->>Cache: Request Leaderboard (page 1)
  Cache-->>Client: Returns cached results
  Note over DB: Under the hood, idx_profiles_score_username speeds up query scan times.
```
