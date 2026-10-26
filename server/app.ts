import express from 'express'
import cors from 'cors'
import { analyzeHandler } from './routes/analyze.js'
import { agentHandler } from './routes/agent.js'
import { transcribeHandler } from './routes/transcribe.js'
import { visualizeHandler } from './routes/visualize.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/analyze', analyzeHandler)
app.post('/api/agent', agentHandler)
app.post('/api/transcribe', transcribeHandler)
app.post('/api/visualize', visualizeHandler)

export default app
