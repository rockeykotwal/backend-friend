# Backend Friend

**ESLint for your database queries.** AI-powered ORM query analyzer that finds N+1 problems, missing indexes, and overfetching in your Prisma, TypeORM, and Sequelize code — and gives you the fixed ORM code back.

Built for the Meta Global AI Developer Hackathon 2026 by [Rockey Kotwal](https://rockeykotwal.in/).

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

Or use the web app at [backend-friend.vercel.app](https://backend-friend.vercel.app)

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

```
backend-friend/
├── server/
│   ├── app.ts              # Express app — shared by all deploy targets
│   ├── index.ts            # Self-hosting entry (npm start)
│   ├── _client.ts          # Meta Model API client
│   ├── _prompt.ts          # System prompts
│   └── routes/
│       ├── analyze.ts      # POST /api/analyze — single query analysis
│       ├── agent.ts        # POST /api/agent   — agentic codebase scan
│       ├── transcribe.ts   # POST /api/transcribe — voice input
│       └── visualize.ts    # POST /api/visualize — execution plan image
├── api/
│   └── index.ts            # Vercel entry — thin wrapper over server/app.ts
└── src/                    # React/Vite frontend
```

All API routes stream responses via Server-Sent Events. The agent auto-selects `muse-wonder-1.0` for large inputs (80K+ tokens) and `muse-spark-1.3-contributor` for everything else.

---

## License

MIT
