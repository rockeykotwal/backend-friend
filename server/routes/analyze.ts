import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'
import { ANALYSIS_SYSTEM_PROMPT } from '../_prompt.js'

export async function analyzeHandler(req: Request, res: Response) {
  const { query, schema } = req.body as { query: string; schema: string }
  if (!query || !schema) return res.status(400).json({ error: 'query and schema are required' })

  const userContent = `ORM Query:\n\`\`\`\n${query}\n\`\`\`\n\nSchema:\n\`\`\`\n${schema}\n\`\`\``
  const model = MODELS.balanced

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Model-Used', model)

  try {
    const stream = await metaClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      stream: true
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
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
