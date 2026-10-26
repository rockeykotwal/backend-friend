import express from 'express'
import cors from 'cors'
import { analyzeHandler } from './routes/analyze'
import { agentHandler } from './routes/agent'
import { transcribeHandler } from './routes/transcribe'
import { visualizeHandler } from './routes/visualize'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/analyze', analyzeHandler)
app.post('/api/agent', agentHandler)
app.post('/api/transcribe', transcribeHandler)
app.post('/api/visualize', visualizeHandler)

export default app
