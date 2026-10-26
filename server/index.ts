import 'dotenv/config'
import path from 'path'
import express from 'express'
import app from './app.js'

const PORT = process.env.PORT ?? 3000

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`\n⚡ Backend Friend running on http://localhost:${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/analyze\n`)
})
