import type { VercelRequest, VercelResponse } from '@vercel/node'
import { metaClient, MODELS } from './_client'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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

    res.status(200).json({ url: response.data[0].url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Visualisation failed'
    res.status(500).json({ error: message })
  }
}
