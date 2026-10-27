import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { analyzeHandler } from './routes/analyze.js'
import { agentHandler } from './routes/agent.js'
import { githubHandler } from './routes/github.js'
import { transcribeHandler } from './routes/transcribe.js'
import { visualizeHandler } from './routes/visualize.js'
import { MAX_BODY_SIZE, TRANSCRIBE_MAX_BODY_SIZE, RATE_LIMITS, RATE_LIMIT_MESSAGE } from './config/limits.js'

const app = express()
app.set('trust proxy', 1) // Cloudflare → Vercel: read real client IP from X-Forwarded-For

app.use(cors())

// ─── Layer 1: Request size cap (per-route so transcribe gets a larger audio limit) ──
const json      = express.json({ limit: MAX_BODY_SIZE })
const jsonAudio = express.json({ limit: TRANSCRIBE_MAX_BODY_SIZE })

// ─── Layer 2: Per-route IP rate limits ────────────────────────────────────────────
function limiter(max: number) {
  return rateLimit({
    windowMs: RATE_LIMITS.WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMIT_MESSAGE,
  })
}

app.post('/api/analyze',    json,      limiter(RATE_LIMITS.ANALYZE),    analyzeHandler)
app.post('/api/agent',      json,      limiter(RATE_LIMITS.AGENT),      agentHandler)
app.post('/api/github',     json,      limiter(RATE_LIMITS.GITHUB),     githubHandler)
app.post('/api/transcribe', jsonAudio, limiter(RATE_LIMITS.TRANSCRIBE), transcribeHandler)
app.post('/api/visualize',  json,      limiter(RATE_LIMITS.VISUALIZE),  visualizeHandler)

export default app
