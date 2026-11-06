import type { Request, Response } from 'express'
import { ANALYSIS_SYSTEM_PROMPT } from '../_prompt.js'
import { resolveClient } from '../utils/resolveClient.js'

export async function analyzeHandler(req: Request, res: Response) {
  const { query, schema } = req.body as { query: string; schema: string }
  if (!query || !schema) return res.status(400).json({ error: 'query and schema are required' })

  let provider
  try {
    provider = resolveClient(req.body as Record<string, unknown>)
  } catch {
    return res.status(401).json({ error: 'Invalid or expired API key session — please re-enter your key and try again.' })
  }

  const model = provider.resolveModel('balanced')
  const userContent = `ORM Query:\n\`\`\`\n${query}\n\`\`\`\n\nSchema:\n\`\`\`\n${schema}\n\`\`\``

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Model-Used', model)

  try {
    const stream = await provider.streamChat({ system: ANALYSIS_SYSTEM_PROMPT, userContent, tier: 'balanced' })

    for await (const text of stream) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: message })
    }
  }
}
