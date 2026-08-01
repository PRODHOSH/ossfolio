# Architecture

## Overview

OSSfolio follows a modern full-stack architecture built with Next.js, Supabase, and the GitHub GraphQL API. The application enables developers to authenticate with GitHub, aggregate their open-source contribution data, store processed information in Supabase, and present it through a responsive portfolio interface.

The application uses the Next.js App Router for both frontend rendering and backend API endpoints, while Supabase provides the database layer and GitHub serves as the primary external data source.

```
                        +-------------------------+
                        |      Web Browser        |
                        +------------+------------+
                                     |
                                     | HTTPS
                                     |
                        +------------v------------+
                        |      Next.js App        |
                        | React + TypeScript      |
                        | App Router              |
                        +------------+------------+
                                     |
                     Server Components / API Routes
                                     |
                                     |
                +--------------------+--------------------+
                |                                         |
                ▼                                         ▼
      GitHub GraphQL API                      Supabase (PostgreSQL)
      Authentication                          User Data
      Contribution Data                       Cached Profiles
      Repository Metadata                     Application State
```

---

# System Components

## Frontend

The frontend is built using Next.js App Router and React.

### Responsibilities

- Rendering contributor profiles
- Dashboard UI
- Authentication interface
- Data visualisation
- Responsive layouts
- Client-side interactions

### Main Modules

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── home/
│   ├── layout/
│   └── profile/
├── lib/
└── types/
```

---

## Backend

The backend is implemented using Next.js Server Components and API Routes.

### Responsibilities

- GitHub authentication
- GitHub GraphQL requests
- Score calculation
- Profile aggregation
- Database operations
- Business logic

---

# Request Lifecycle

Every request follows a layered architecture.

```
Browser
    │
    ▼
Next.js Route
    │
    ▼
Server Component /
API Route
    │
    ▼
Business Logic
    │
    ├────────► GitHub GraphQL API
    │
    └────────► Supabase
                │
                ▼
         Process Response
                │
                ▼
        Render UI / JSON
```

---

# Authentication Flow

OSSfolio authenticates users using GitHub OAuth.

```
User
   │
   ▼
GitHub Sign In
   │
   ▼
GitHub Authentication
   │
   ▼
Access Token
   │
   ▼
Fetch GitHub Profile
   │
   ▼
Store User Information
   │
   ▼
Authenticated Session
```

---

# Profile Generation Flow

```
User Login
      │
      ▼
GitHub GraphQL API
      │
      ▼
Fetch

• Repositories
• Pull Requests
• Issues
• Reviews
• Organisations
• Contribution History

      │
      ▼
Calculate Contributor Score
      │
      ▼
Store / Update Supabase
      │
      ▼
Generate Public Profile
```

---

# Contributor Score Flow

```
GitHub Activity
       │
       ▼
Collect Metrics
       │
       ├────────► Commits
       ├────────► Pull Requests
       ├────────► Issues
       ├────────► Reviews
       └────────► Stars
                  │
                  ▼
Score Calculation
                  │
                  ▼
Contributor Score
                  │
                  ▼
Profile Dashboard
```

---

# Backend Architecture

```
Next.js API Route
        │
        ▼
Business Logic
        │
        ├────────► GitHub API
        └────────► Supabase
                    │
                    ▼
            Database Operations
                    │
                    ▼
              Response Builder
```

---

# Data Flow

```
User
   │
   ▼
React Components
   │
   ▼
Server Components
   │
   ▼
API Routes
   │
   ▼
GitHub GraphQL API
   │
   ▼
Contribution Data
   │
   ▼
Score Engine
   │
   ▼
Supabase Database
   │
   ▼
Rendered Profile
```

---

# Database Design

Conceptually, the application manages:

```
User
 │
 ├──────── Profile
 │
 ├──────── Contribution Summary
 │
 ├──────── Activity Statistics
 │
 ├──────── Organizations
 │
 └──────── Contributor Score
```

---

# External Services

## GitHub GraphQL API

Responsible for:

- User authentication
- Repository information
- Pull requests
- Issues
- Reviews
- Contribution statistics

---

## Supabase

Responsible for:

- User records
- Cached profile data
- Application state
- PostgreSQL database

---

# Security Architecture

Current security mechanisms include:

- GitHub OAuth authentication
- Secure server-side API requests
- Environment variable configuration
- Protected server-side operations
- Database access through Supabase

---

# Folder Responsibilities

| Folder                   | Responsibility                           |
| ------------------------ | ---------------------------------------- |
| `src/app`                | Next.js App Router pages and API routes  |
| `src/components`         | Reusable UI components                   |
| `src/components/home`    | Landing page sections                    |
| `src/components/layout`  | Navigation and layout                    |
| `src/components/profile` | Profile-related UI                       |
| `src/lib`                | API clients, utilities, helper functions |
| `src/types`              | TypeScript definitions                   |
| `supabase/migrations`    | Database migrations                      |
| `supabase/schema.sql`    | Database schema                          |
| `public`                 | Static assets                            |

---

# Deployment Architecture

```
                  Internet
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
      Cloudflare Pages        GitHub GraphQL API
              │
              ▼
         Next.js Server
              │
              ▼
      Supabase PostgreSQL
```

---

# Scalability Considerations

The architecture is designed to support:

- Additional OAuth providers
- Contribution analytics
- More profile metrics
- Cached GitHub responses
- Background data synchronisation
- Leaderboards
- Public APIs
- Performance optimisation

---

# Design Principles

The project follows modern software engineering principles:

- Separation of Concerns
- Server-First Rendering
- Component-Based UI
- Modular Architecture
- Reusable Utilities
- Type Safety
- Scalable Database Design
- Maintainable Codebase
