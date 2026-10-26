# Backend Friend

**ESLint for your database queries.** AI-powered ORM query analyzer that finds N+1 problems, missing indexes, and overfetching in your Prisma, TypeORM, and Sequelize code — and gives you the fixed ORM code back.

Built for the Meta Global AI Developer Hackathon 2026 by Rockey Kotwal.

## What it does

- **Analyze a single query** — paste your ORM query + schema, get severity badge + explanation + SQL being generated + fixed ORM code + migration script
- **Scan your codebase (agentic)** — point it at your source files, it finds every ORM query, analyses them all, and returns a ranked list of issues — critical first
- **Voice input** — describe your query problem out loud via Muse Voice Transcribe
- **Execution plan visual** — Muse Image generates a before/after diagram of your query execution

## Meta Models Used

| Model | Role |
|---|---|
| `muse-spark-1.3-contributor` | Core ORM analysis + agentic orchestration (open-weight) |
| `muse-wonder-1.0` | Large codebase fallback (80K+ token inputs) |
| `muse-image-1.0` | Before/after execution plan diagram |
| `muse-voice-transcribe-1.0` | Voice-to-query input |

## Quick start

```bash
npx backend-friend check
```

Or use the web app at [backend-friend.vercel.app](https://backend-friend.vercel.app)

## Local development

```bash
git clone https://github.com/rockeykotwal/backend-friend
cd backend-friend
npm install
cp .env.example .env  # add your META_MODEL_API_KEY
npm run dev
```

## License

MIT
