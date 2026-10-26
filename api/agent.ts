import type { VercelRequest, VercelResponse } from '@vercel/node'
import { metaClient, MODELS } from './_client'
import { AGENT_SYSTEM_PROMPT } from './_prompt'

export const config = { maxDuration: 60 }

const ORM_PATTERNS = /prisma|typeorm|sequelize|findMany|findOne|findAll|createQueryBuilder|getRepository/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { files } = req.body as { files: Array<{ path: string; content: string }> }
  if (!files?.length) return res.status(400).json({ error: 'files array is required' })

  const ormFiles = files.filter(f => ORM_PATTERNS.test(f.content))
  if (!ormFiles.length) return res.status(200).json({ findings: [], message: 'No ORM queries detected' })

  const fileBundle = ormFiles.map(f => `// FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n')
  const inputTokenEstimate = (fileBundle.length + AGENT_SYSTEM_PROMPT.length) / 4
  const model = inputTokenEstimate > 80_000 ? MODELS.wonder : MODELS.spark

  try {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Files-Scanned', String(files.length))
    res.setHeader('X-Orm-Files-Found', String(ormFiles.length))
    res.setHeader('X-Model-Used', model)

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
