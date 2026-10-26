import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'
import { AGENT_SYSTEM_PROMPT } from '../_prompt.js'

const ORM_PATTERNS = /prisma|typeorm|sequelize|findMany|findOne|findAll|createQueryBuilder|getRepository/i

export async function agentHandler(req: Request, res: Response) {
  const { files } = req.body as { files: Array<{ path: string; content: string }> }
  if (!files?.length) return res.status(400).json({ error: 'files array is required' })

  const ormFiles = files.filter(f => ORM_PATTERNS.test(f.content))
  if (!ormFiles.length) return res.status(200).json({ findings: [], message: 'No ORM queries detected' })

  const fileBundle = ormFiles.map(f => `// FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n')
  const inputTokenEstimate = (fileBundle.length + AGENT_SYSTEM_PROMPT.length) / 4
  const model = inputTokenEstimate > 80_000 ? MODELS.wonder : MODELS.spark

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Files-Scanned', String(files.length))
  res.setHeader('X-Orm-Files-Found', String(ormFiles.length))
  res.setHeader('X-Model-Used', model)

  try {
    const stream = await metaClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: fileBundle }
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
    const message = err instanceof Error ? err.message : 'Agent scan failed'
    res.status(500).json({ error: message })
  }
}
