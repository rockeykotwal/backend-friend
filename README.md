# Backend Friend

**Catch what's killing your database before it kills your app.** AI-powered database query analyzer that finds N+1 problems, missing indexes, overfetching, and more — across every major backend language — and gives you the fixed code back.

Built for the Meta Global AI Developer Hackathon 2026 by [Rockey Kotwal](https://rockeykotwal.in/).

## The Problem

Every backend engineer, regardless of language, uses an ORM. Prisma, TypeORM, and Sequelize in Node.js. SQLAlchemy and Django ORM in Python. Hibernate in Java. GORM in Go. ActiveRecord in Ruby. Entity Framework in C#.

ORMs make development fast — but they hide what's actually happening at the database level. And that's where production incidents are born.

**The N+1 problem** is the most common and most expensive. It looks innocent in code:

```typescript
// Looks fine. Feels fine. Destroys your database.
const users = await prisma.user.findMany()
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } })
}
```

If you have 500 users, this runs **501 database queries** — one to fetch users, one per user to fetch posts. At 10,000 requests per minute, that's **5 million extra queries per minute**. Connection pool exhausted. Response times spike. App goes down.

**The tools that exist today don't help at the right moment.** pganalyze, EverSQL, pgMustard — they analyse raw SQL from query logs, after the damage is done. They show you the problem in database terms. They don't know you're using Prisma. They can't give you the fixed ORM code. You still have to translate the diagnosis back into your codebase manually.

**Backend Friend works at the ORM level** — where you actually write code. It understands your schema, reads your queries, and gives you back fixed ORM code and a migration script. Not a SQL explanation. The actual fix, ready to paste.

---

## Language & ORM Support

Full-depth support across all 8 languages — smart block extraction (only ORM code is sent to the model, not your whole file), accurate SQL representation, fixed code returned in your language, and migration scripts when indexes are needed.

| Language | SQL / Query Builders | NoSQL |
|---|---|---|
| **Node.js** | Prisma, TypeORM, Sequelize, Drizzle, MikroORM, Knex, Kysely, Objection.js, Waterline, Bookshelf | Mongoose, MongoDB native driver |
| **Python** | SQLAlchemy (1.x + 2.0), Django ORM, Peewee, Tortoise ORM, SQLModel | PyMongo, Motor, MongoEngine |
| **Go** | GORM, sqlx, Ent, bun, database/sql, sqlc | mongo-go-driver |
| **Java / Kotlin** | Hibernate/JPA, Spring Data JPA, MyBatis, jOOQ, JdbcTemplate, Kotlin Exposed | — |
| **Ruby** | ActiveRecord, Sequel | — |
| **PHP** | Eloquent (Laravel), Doctrine | — |
| **C#** | Entity Framework Core, Dapper, ADO.NET | — |
| **Rust** | Diesel, SQLx, SeaORM | — |

---

## What it does

- **Analyze a single query** — paste your ORM query + schema, get a severity badge, explanation, the SQL being generated, fixed ORM code, and a migration script if needed
- **Scan a GitHub repo (agentic)** — paste a GitHub URL, the agent fetches the repo, finds every ORM query across all files, analyses them all, and returns a ranked list of issues — critical first
- **Scan a local folder** — upload your project folder for the same agentic scan without pushing to GitHub
- **Voice input** — describe your query problem out loud via Muse Voice Transcribe, transcript appends directly to the query box
- **Execution plan visual** — Muse Image generates a before/after diagram of your query execution plan

## Meta Models Used

Backend Friend uses four Meta models, each chosen for a specific job. Full specs at [dev.meta.ai/docs/models](https://dev.meta.ai/docs/models).

| Mode | Model | Role | Privacy |
|---|---|---|---|
| **Balanced** *(default)* | [`muse-spark-1.3`](https://dev.meta.ai/docs/models) | Core analysis + agentic scan — fast, accurate, handles most codebases | Code never used for training |
| **Deep Analysis** | [`muse-wonder-1.0`](https://dev.meta.ai/docs/models) | Large repos, subtle multi-file bugs, complex architecture — Meta's most capable API model | Code never used for training |
| **Economy** *(opt-in)* | [`muse-spark-1.3-contributor`](https://dev.meta.ai/docs/models) | Same quality as Balanced — open-weight variant, fraction of the cost | ⚠ Meta may use submitted code to train future models. Explicit consent required. |
| — | [`muse-image-1.0`](https://dev.meta.ai/docs/models) | Before/after query execution plan diagram | — |
| — | [`muse-voice-transcribe-1.0`](https://dev.meta.ai/docs/models) | Voice-to-query input | — |

Economy mode is gated behind an explicit consent checkbox in the UI — it is never the default and never a silent fallback. All three text models share a 1M token context window.

---

## Self-hosting

Backend Friend is a standard Express + React app. You need one environment variable:

```
META_MODEL_API_KEY=your_key_here
```

Get a free API key at [dev.meta.ai](https://dev.meta.ai).

### Local development

```bash
git clone https://github.com/rockeykotwal/backend-friend
cd backend-friend
npm install
cp .env.example .env        # add your META_MODEL_API_KEY
npm run dev                 # Vite on :5173, Express API on :3000
```

### Testing

```bash
# Unit tests — fast, no API calls, safe to run anytime
npm test

# API contract tests — fires real requests, uses Meta API credits
# Requires the server running in a separate terminal first
npm run dev:api       # terminal 1
npm run test:contract # terminal 2
```

### Production (any Node.js host)

```bash
npm run build               # builds React app into dist/
npm start                   # Express serves API + dist/ on PORT (default 3000)
```

Set `NODE_ENV=production` and `PORT` as needed.

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set `META_MODEL_API_KEY` in your Vercel project environment variables. Vercel serves the frontend from CDN and routes `/api/*` to Express serverless — no other config needed.

### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t backend-friend .
docker run -p 3000:3000 -e META_MODEL_API_KEY=your_key_here backend-friend
```

---

## Architecture

The project is intentionally split so the core application has zero platform dependencies.

```
backend-friend/
├── server/                 # ← The entire application lives here
│   ├── app.ts              #   Express app — no Vercel, no platform code, runs anywhere
│   ├── index.ts            #   Standalone entry: node server/index.ts (or npm start)
│   ├── _client.ts          #   Meta Model API client
│   ├── _prompt.ts          #   System prompts for Muse Spark / Muse Wonder
│   └── routes/
│       ├── analyze.ts      #   POST /api/analyze    — single query analysis (streaming SSE)
│       ├── agent.ts        #   POST /api/agent      — agentic folder scan (streaming SSE)
│       ├── github.ts       #   POST /api/github     — agentic GitHub URL scan (streaming SSE)
│       ├── transcribe.ts   #   POST /api/transcribe — voice input via Muse Voice
│       └── visualize.ts    #   POST /api/visualize  — execution plan image via Muse Image
│
├── api/
│   └── index.ts            #   ⚠️  Vercel-only. 5 lines. Just imports server/app.ts.
│                           #   Vercel requires serverless functions in api/ — ignore if
│                           #   deploying anywhere else.
│
├── src/                    #   React/Vite frontend
│   ├── utils/
│   │   ├── extractOrmBlocks.ts   # Smart ORM block extraction — all 8 languages
│   │   └── analytics.ts          # GA4 event tracking
│   └── components/
│       ├── QueryAnalyzer.tsx     # Single query analysis tab
│       ├── AgentScanner.tsx      # Codebase scan tab (GitHub URL + folder upload)
│       ├── AnalysisResult.tsx    # Result card with severity, code sections, visual
│       ├── VoiceInput.tsx        # Voice recording + transcription
│       └── MetaLoader.tsx        # Animated loading state during analysis
│
└── tests/
    └── contract/
        └── analyze.contract.test.ts  # Layer B — API contract tests (manual)
```

All API routes stream responses via Server-Sent Events. The analysis model is user-selectable (Balanced / Deep Analysis / Economy) and passed per-request — no silent auto-switching.

---

## Rate Limiting

Backend Friend has two layers of abuse protection built in, both configurable from a single file (`server/config/limits.ts`):

**Layer 1 — Request size cap**
All incoming JSON payloads are capped at 50kb before they reach the model. Oversized requests are rejected immediately.

**Layer 2 — Per-IP rate limits (15-minute rolling window)**

| Endpoint | Limit | Reason |
|---|---|---|
| `POST /api/analyze` | 20 req / 15 min | One model call per request |
| `POST /api/visualize` | 20 req / 15 min | One image generation per request |
| `POST /api/github` | 5 req / 15 min | Downloads repo files + model call |
| `POST /api/agent` | 5 req / 15 min | Same cost as GitHub scan |
| `POST /api/transcribe` | 20 req / 15 min | Lighter — short audio clips only |

To adjust any limit, edit the constants in `server/config/limits.ts` — no other file needs changing.

A third layer using Cloudflare Turnstile (invisible bot challenge at the network edge) is planned post-launch.

---

## Roadmap

### `npx backend-friend` — CLI tool

Run Backend Friend directly from your terminal without opening a browser:

```bash
# Scan a local project folder
npx backend-friend scan ./src

# Analyze a single file
npx backend-friend check src/routes/orders.ts

# Output formats
npx backend-friend scan ./src --format json   # machine-readable, pipe into other tools
npx backend-friend scan ./src --format table  # compact terminal summary
npx backend-friend scan ./src --severity critical,high  # filter by severity
```

The CLI uses the same smart ORM extraction and Meta model analysis as the web app. Designed to be fast enough to run as a pre-commit hook or a pre-push check:

```bash
# .husky/pre-push
npx backend-friend scan ./src --severity critical --fail-on-findings
```

If any CRITICAL issues are found, the push is blocked. Catches N+1s before they reach production.

---

### GitHub Action — automated PR scanning

Add Backend Friend to your CI pipeline with a single workflow file:

```yaml
# .github/workflows/backend-friend.yml
name: Database Query Audit

on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rockeykotwal/backend-friend-action@v1
        with:
          api-key: ${{ secrets.META_MODEL_API_KEY }}
          severity-threshold: high   # fail on HIGH or CRITICAL only
          comment-on-pr: true        # posts findings as a PR comment
```

When a PR touches files with ORM queries, the action:
1. Extracts all ORM blocks from changed files only (not the whole repo)
2. Analyses each one with Muse Spark
3. Posts findings as an inline PR comment — critical issues first
4. Optionally fails the check if severity threshold is breached

This makes Backend Friend part of the merge gate — database bugs get the same treatment as type errors or lint failures.

---

### Cloudflare Turnstile — Layer 3 bot protection

Invisible CAPTCHA challenge at the network edge before requests reach the server. Planned post-launch on top of the existing rate limiting layers.

---

## License

MIT
