import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { analyzeHandler } from './routes/analyze.js'
import { agentHandler } from './routes/agent.js'
import { githubHandler } from './routes/github.js'
import { transcribeHandler } from './routes/transcribe.js'
import { visualizeHandler } from './routes/visualize.js'
import { MAX_BODY_SIZE, RATE_LIMITS, RATE_LIMIT_MESSAGE } from './config/limits.js'

const app = express()

// ─── Layer 1: Request size cap ─────────────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: MAX_BODY_SIZE }))

// ─── Layer 2: Per-route IP rate limits ────────────────────────────────────────
function limiter(max: number) {
  return rateLimit({
    windowMs: RATE_LIMITS.WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMIT_MESSAGE,
  })
}

app.post('/api/analyze',    limiter(RATE_LIMITS.ANALYZE),    analyzeHandler)
app.post('/api/agent',      limiter(RATE_LIMITS.AGENT),      agentHandler)
app.post('/api/github',     limiter(RATE_LIMITS.GITHUB),     githubHandler)
app.post('/api/transcribe', limiter(RATE_LIMITS.TRANSCRIBE), transcribeHandler)
app.post('/api/visualize',  limiter(RATE_LIMITS.VISUALIZE),  visualizeHandler)

export default app
