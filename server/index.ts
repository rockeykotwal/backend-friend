import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { analyzeHandler } from './routes/analyze'
import { agentHandler } from './routes/agent'
import { transcribeHandler } from './routes/transcribe'
import { visualizeHandler } from './routes/visualize'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/analyze', analyzeHandler)
app.post('/api/agent', agentHandler)
app.post('/api/transcribe', transcribeHandler)
app.post('/api/visualize', visualizeHandler)

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`\n⚡ Backend Friend running on http://localhost:${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/analyze\n`)
})
