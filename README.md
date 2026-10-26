# Backend Friend

**ESLint for your database queries.** AI-powered ORM query analyzer that finds N+1 problems, missing indexes, and overfetching in your Prisma, TypeORM, and Sequelize code — and gives you the fixed ORM code back.

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

**Backend Friend works at the ORM level** — where you actually write code. It understands your schema, reads your Prisma/TypeORM/Sequelize queries, and gives you back fixed ORM code and a migration script. Not a SQL explanation. The actual fix, ready to paste.

The problem is universal across every language and every ORM. Backend Friend starts with Node.js — the most widely used backend runtime — and the architecture is built to extend.

---

## What it does

- **Analyze a single query** — paste your ORM query + schema, get severity badge + explanation + SQL being generated + fixed ORM code + migration script
- **Scan your codebase (agentic)** — point it at your source files, the agent finds every ORM query, analyses them all, and returns a ranked list of issues — critical first
- **Voice input** — describe your query problem out loud via Muse Voice Transcribe
- **Execution plan visual** — Muse Image generates a before/after diagram of your query execution

## Meta Models Used

| Model | Role |
|---|---|
| `muse-spark-1.3-contributor` | Core ORM analysis + agentic orchestration (open-weight) |
| `muse-wonder-1.0` | Large codebase fallback — auto-swaps in above 80K tokens |
| `muse-image-1.0` | Before/after execution plan diagram |
| `muse-voice-transcribe-1.0` | Voice-to-query input |

## Quick start (npx)

```bash
npx backend-friend check
```

Or use the web app at [backend-friend.rockeykotwal.in](https://backend-friend.rockeykotwal.in/)

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
│       ├── analyze.ts      #   POST /api/analyze    — single query analysis (streaming)
│       ├── agent.ts        #   POST /api/agent      — agentic codebase scan (streaming)
│       ├── transcribe.ts   #   POST /api/transcribe — voice input via Muse Voice
│       └── visualize.ts    #   POST /api/visualize  — execution plan image via Muse Image
│
├── api/
│   └── index.ts            #   ⚠️  Vercel-only. 5 lines. Just imports server/app.ts.
│                           #   Vercel requires serverless functions to live in api/ — this
│                           #   file exists solely to satisfy that convention. If you are
│                           #   deploying anywhere other than Vercel, ignore this folder.
│
└── src/                    # React/Vite frontend
```

All API routes stream responses via Server-Sent Events. The agent auto-selects `muse-wonder-1.0` for large inputs (80K+ tokens) and `muse-spark-1.3-contributor` for everything else.

---

## License

MIT
