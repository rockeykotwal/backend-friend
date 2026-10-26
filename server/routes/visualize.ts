import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'

export async function visualizeHandler(req: Request, res: Response) {
  const { problem, fix, impact } = req.body as { problem: string; fix: string; impact: string }
  if (!problem || !fix) return res.status(400).json({ error: 'problem and fix are required' })

  const prompt = `Create a clean technical diagram comparing two database query execution plans.

LEFT side labeled "BEFORE" (red/orange tones):
- Show ${problem}
- Visualise multiple redundant DB calls or a full table scan
- Label the inefficiency clearly

RIGHT side labeled "AFTER" (green tones):
- Show the optimised execution: ${fix}
- Show a single efficient query or index usage
- Label the improvement

Bottom: show the impact stat: "${impact}"

Style: dark background, minimal, technical, developer-friendly. No decorative elements.`

  try {
    const response = await metaClient.images.generate({
      model: MODELS.image,
      prompt,
      n: 1,
      size: '1792x1024'
    })

    res.status(200).json({ url: response.data?.[0]?.url ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Visualisation failed'
    res.status(500).json({ error: message })
  }
}
