<div align="center">

# OSSfolio

**Your open-source identity, beyond GitHub.**

[![EluSoC Season 1 2026](https://img.shields.io/badge/EluSoC-Season%201%202026-6366f1?style=flat-square)](https://github.com/PRODHOSH/ossfolio)
[![CI](https://github.com/PRODHOSH/ossfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/PRODHOSH/ossfolio/actions/workflows/ci.yml)
[![CodeQL](https://github.com/PRODHOSH/ossfolio/actions/workflows/codeql.yml/badge.svg)](https://github.com/PRODHOSH/ossfolio/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![All Contributors](https://img.shields.io/github/all-contributors/PRODHOSH/ossfolio?color=ee8449)](https://github.com/PRODHOSH/ossfolio#contributors)

**OSSfolio is participating in EluSoC Season 1 2026.**
If you are here through EluSoC, welcome! Read through this README and then check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

</div>

---

## What is OSSfolio?

GitHub shows your repos. OSSfolio shows **you**.

OSSfolio is a free, open-source platform where every contributor gets a public profile page at `https://ossfolio.qzz.io//username` — showcasing the full picture of their open-source journey. The PRs you merged into other projects, the issues you filed, the orgs you contributed to, the programs you participated in like GSoC or GSSoC — all in one shareable link.

No manual input. Just sign in with GitHub and your profile is ready.

## Documentation
- See [API Reference Architecture](docs/api-reference-architecture.md) for endpoint specs.
- See [System Flow Diagrams](docs/system-diagrams.md) for database and network flows.

---

## Why does this exist?

GitHub profiles are built around repositories — stars, forks, and commit graphs tell only part of the story.

If you have spent months reviewing PRs, triaging issues, contributing to other people's projects, or participating in GSoC/GSSoC — none of that shows up clearly on your GitHub profile. Recruiters miss it. Maintainers miss it. You cannot share it.

OSSfolio is built to fix that — for students applying to GSoC, for developers sharing their work with recruiters, and for anyone who wants their contributions to actually be seen.

---

## Features

- **Shareable profile** at `https://ossfolio.qzz.io//username`
- **Contribution stats** — merged PRs, issues opened, commits, reviews
- **Heatmap and streak** — visualise your activity across the year
- **Tech stack** — auto-detected from your repos, no tagging needed
- **Organizations** — every org you have contributed to
- **GSoC / GSSoC badges** — show your program participation
- **Contributor score** — a single number summarising your impact
- **Leaderboard** — see how you rank against other contributors

---

## How the Score Works

OSSfolio calculates a contributor score to provide a quick summary of a developer's open-source activity.

The score combines different types of contributions across GitHub and assigns a weight to each activity type. Higher scores generally indicate more contribution activity, but the score should be viewed as a summary rather than a measure of skill or developer quality.

### Scoring Weights

| Activity         | Weight                                |
| ---------------- | ------------------------------------- |
| Commits          | 1 point each                          |
| Pull Requests    | 3 points each                         |
| Issues           | 2 points each                         |
| Reviews          | 2 points each                         |
| Repository Stars | 0.1 point each (capped at 1000 stars) |

### What the Score Measures

The score is designed to capture a mix of:

* Code contributions through commits
* Collaboration through pull requests and reviews
* Community participation through issues
* Project impact through repository stars

### What the Score Does Not Measure

The contributor score is **not a ranking system** and should not be treated as a definitive measure of developer skill, experience, or value.

It is simply a lightweight summary of publicly visible open-source activity.

### Implementation Details

Contributors who want to understand the exact implementation can review:

```text
src/lib/score.ts
```

---


## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion |
| Backend | Supabase · PostgreSQL |
| Data | GitHub GraphQL API |
| Hosting | Cloudflare Pages |

---

## Running it locally

**What you need before starting:**
- Node.js 20+
- A free [Supabase](https://supabase.com) account
- Git

**Steps:**

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/prodhosh/ossfolio.git
cd ossfolio

# 2. Install dependencies
npm install

# 3. Copy the environment variables file
cp .env.example .env.local
```

**Setting up the database (pick one):**

> **Option A — Supabase Dashboard** (recommended for most contributors, no extra tools needed)
> 1. Create a free project at [supabase.com](https://supabase.com)
> 2. Go to your project → **SQL Editor → New query**
> 3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) → paste → click **Run**
> 4. All tables and permissions are created instantly

> **Option B — Supabase CLI** (if you prefer local development with Docker)
> ```bash
> npm install -g supabase
> supabase start       # starts a local Supabase instance
> supabase db reset    # creates all tables + loads sample data
> ```

**Finishing up:**

Once Supabase is set up, copy your project URL and anon key into `.env.local` (you will find them in your Supabase dashboard under **Project Settings → API**), then:

```bash
npm run dev
```

Open `http://localhost:3000` and you are in.

For a detailed walkthrough — environment variables, GitHub OAuth setup, database change guidelines — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Want to contribute?

OSSfolio is built by contributors, for contributors. That is kind of the whole point.

**Before you start:**

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) — it covers setup, rules, and what we expect
2. Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — short and worth it

**How to get started:**

1. Browse [open issues](https://github.com/PRODHOSH/ossfolio/issues) — filter by `good first issue` if it is your first time
2. Comment on the issue with your approach, written in your own words
3. Wait to be assigned before you start working
4. Open your PR once assigned, fill out the template fully

**A few things to keep in mind:**

- Do not submit a PR without being assigned to the issue first
- Once you submit a PR, it will be reviewed within 12 hours. Please be patient and avoid pinging repeatedly before that time
- If you used AI to help write code, mention it in the PR and make sure you actually understand everything you changed
- If you have doubts, you can reach out on [LinkedIn](https://www.linkedin.com/in/prodhoshvs/) — send one message and give some time for a response

---

## Project Structure

```
ossfolio/
├── src/
│   ├── app/              # Next.js app router pages and API routes
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Base shadcn/ui components
│   │   ├── home/         # Landing page sections
│   │   ├── layout/       # Header, footer, navigation
│   │   └── profile/      # Profile page components
│   ├── lib/              # Utilities, helpers, API clients
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── migrations/       # Database migration files (one per schema change)
│   ├── schema.sql        # Full schema for dashboard setup
│   └── seed.sql          # Sample data for local development
└── public/               # Static assets
```

---

## Contributors

Everyone who has helped build OSSfolio — code, design, docs, ideas, all of it.

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://prodhosh.me/"><img src="https://avatars.githubusercontent.com/u/213995806?v=4?s=100" width="100px;" alt="PRODHOSH V.S"/><br /><sub><b>PRODHOSH V.S</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=PRODHOSH" title="Code">💻</a> <a href="https://github.com/PRODHOSH/ossfolio/commits?author=PRODHOSH" title="Documentation">📖</a> <a href="#design-PRODHOSH" title="Design">🎨</a> <a href="https://github.com/PRODHOSH/ossfolio/issues?q=author%3APRODHOSH" title="Bug reports">🐛</a> <a href="https://github.com/PRODHOSH/ossfolio/pulls?q=is%3Apr+reviewed-by%3APRODHOSH" title="Reviewed Pull Requests">👀</a> <a href="#ideas-PRODHOSH" title="Ideas, Planning, & Feedback">🤔</a> <a href="#maintenance-PRODHOSH" title="Maintenance">🚧</a> <a href="https://github.com/PRODHOSH/ossfolio/commits?author=PRODHOSH" title="Tests">⚠️</a> <a href="#infra-PRODHOSH" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/karishma9142"><img src="https://avatars.githubusercontent.com/u/193392138?v=4?s=100" width="100px;" alt="Karishma Kumari"/><br /><sub><b>Karishma Kumari</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=karishma9142" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AnalShaju"><img src="https://avatars.githubusercontent.com/u/133645290?v=4?s=100" width="100px;" alt="Anal Shaju"/><br /><sub><b>Anal Shaju</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=AnalShaju" title="Code">💻</a> <a href="#design-AnalShaju" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SakethSumanBathini"><img src="https://avatars.githubusercontent.com/u/178634012?v=4?s=100" width="100px;" alt="Saketh Suman Bathini"/><br /><sub><b>Saketh Suman Bathini</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=SakethSumanBathini" title="Code">💻</a> <a href="#design-SakethSumanBathini" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cc-c122"><img src="https://avatars.githubusercontent.com/u/242877454?v=4?s=100" width="100px;" alt="cc-c122"/><br /><sub><b>cc-c122</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=cc-c122" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://awaisxdevs.vercel.app"><img src="https://avatars.githubusercontent.com/u/236069266?v=4?s=100" width="100px;" alt="Awais  Khan "/><br /><sub><b>Awais  Khan </b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=iAwaisKhan" title="Code">💻</a> <a href="#design-iAwaisKhan" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Komal-Sharma03"><img src="https://avatars.githubusercontent.com/u/174271565?v=4?s=100" width="100px;" alt="KOMALSHARMA"/><br /><sub><b>KOMALSHARMA</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Komal-Sharma03" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ayushganeshi"><img src="https://avatars.githubusercontent.com/u/174295266?v=4?s=100" width="100px;" alt="Ayushganeshi"/><br /><sub><b>Ayushganeshi</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Ayushganeshi" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://my-portfolio-3d-d9c6.onrender.com/"><img src="https://avatars.githubusercontent.com/u/258796947?v=4?s=100" width="100px;" alt="Saurabh Singh"/><br /><sub><b>Saurabh Singh</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=saurabhsingh72487-hub" title="Code">💻</a> <a href="#design-saurabhsingh72487-hub" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Aditya8369"><img src="https://avatars.githubusercontent.com/u/178887069?v=4?s=100" width="100px;" alt="Aditya Mahajan"/><br /><sub><b>Aditya Mahajan</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/issues?q=author%3AAditya8369" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Adit-Jain-srm"><img src="https://avatars.githubusercontent.com/u/195575011?v=4?s=100" width="100px;" alt="Adit Jain"/><br /><sub><b>Adit Jain</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Adit-Jain-srm" title="Code">💻</a> <a href="https://github.com/PRODHOSH/ossfolio/issues?q=author%3AAdit-Jain-srm" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://allcontributors.org"><img src="https://avatars.githubusercontent.com/u/46410174?v=4?s=100" width="100px;" alt="All Contributors"/><br /><sub><b>All Contributors</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=all-contributors" title="Documentation">📖</a> <a href="#maintenance-all-contributors" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abhilasha2101"><img src="https://avatars.githubusercontent.com/u/144041389?v=4?s=100" width="100px;" alt="Abhilasha Kumari"/><br /><sub><b>Abhilasha Kumari</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=abhilasha2101" title="Code">💻</a> <a href="#design-abhilasha2101" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://parthwebde12.github.io/Portfoliosite-master/"><img src="https://avatars.githubusercontent.com/u/163313000?v=4?s=100" width="100px;" alt="Parth Wakodikar"/><br /><sub><b>Parth Wakodikar</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Parthwebde12" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Babin123456"><img src="https://avatars.githubusercontent.com/u/265290994?v=4?s=100" width="100px;" alt="Babin Bid"/><br /><sub><b>Babin Bid</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Babin123456" title="Code">💻</a> <a href="#design-Babin123456" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tri-pti"><img src="https://avatars.githubusercontent.com/u/169473202?v=4?s=100" width="100px;" alt="Tripti Patel"/><br /><sub><b>Tripti Patel</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=tri-pti" title="Code">💻</a> <a href="#design-tri-pti" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JMR825"><img src="https://avatars.githubusercontent.com/u/152759615?v=4?s=100" width="100px;" alt="Janhavi Rathod"/><br /><sub><b>Janhavi Rathod</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=JMR825" title="Code">💻</a> <a href="https://github.com/PRODHOSH/ossfolio/commits?author=JMR825" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dhruvesh1611"><img src="https://avatars.githubusercontent.com/u/178993802?v=4?s=100" width="100px;" alt="Dhruvesh Shyara"/><br /><sub><b>Dhruvesh Shyara</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Dhruvesh1611" title="Code">💻</a> <a href="#design-Dhruvesh1611" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sentinel-cyberlabs.vercel.app"><img src="https://avatars.githubusercontent.com/u/230796948?v=4?s=100" width="100px;" alt="Utkarsh Singh"/><br /><sub><b>Utkarsh Singh</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=utkarshsingh3011" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/saumyabaranwal"><img src="https://avatars.githubusercontent.com/u/157876101?v=4?s=100" width="100px;" alt="Saumya Baranwal"/><br /><sub><b>Saumya Baranwal</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=saumyabaranwal" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AMillionDriver"><img src="https://avatars.githubusercontent.com/u/157272282?v=4?s=100" width="100px;" alt="Nanang Nurmansah"/><br /><sub><b>Nanang Nurmansah</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=AMillionDriver" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/L337tooka"><img src="https://avatars.githubusercontent.com/u/170666324?v=4?s=100" width="100px;" alt="L337tooka"/><br /><sub><b>L337tooka</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=L337tooka" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/blut-agent"><img src="https://avatars.githubusercontent.com/u/278569635?v=4?s=100" width="100px;" alt="Blut-agent"/><br /><sub><b>Blut-agent</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=blut-agent" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Gaurika-05"><img src="https://avatars.githubusercontent.com/u/182803515?v=4?s=100" width="100px;" alt="Gaurika"/><br /><sub><b>Gaurika</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Gaurika-05" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ayush-0918"><img src="https://avatars.githubusercontent.com/u/184804819?v=4?s=100" width="100px;" alt="AYUSH PANDEY"/><br /><sub><b>AYUSH PANDEY</b></sub></a><br /><a href="https://github.com/PRODHOSH/ossfolio/commits?author=Ayush-0918" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## Star History

<a href="https://www.star-history.com/?repos=PRODHOSH%2Fossfolio&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=PRODHOSH/ossfolio&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=PRODHOSH/ossfolio&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=PRODHOSH/ossfolio&type=date&legend=top-left" />
 </picture>
</a>

---
### My ELUSOC 2026 Admin Badges!

<a href="https://edulinkup.dev/elusoc/profile/PRODHOSH">
  <img src="https://edulinkup.dev/elusoc/images/ticket/overseer.png" width="60" alt="Overseer" />
  <img src="https://edulinkup.dev/elusoc/images/ticket/warden.png" width="60" alt="Warden" />
  <img src="https://www.edulinkup.dev/elusoc/images/ticket/commander.png" width="60" alt="Commander" />
</a>

## License

[MIT](LICENSE) — free to use, fork, and build on.

