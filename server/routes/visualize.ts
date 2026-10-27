import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'

export async function visualizeHandler(req: Request, res: Response) {
  const { problem, fix, impact } = req.body as { problem: string; fix: string; impact: string }
  if (!problem || !fix) return res.status(400).json({ error: 'problem and fix are required' })

  const prompt = `A minimal two-column engineering diagram on a near-black background (#0d1117). No large title — start directly with the two columns.

LEFT column — small label "BEFORE" in muted red (#c0392b), uppercase, 11px:
- Problem: ${problem}
- Show query flow as numbered steps with thin 1px arrows
- Boxes: very subtle dark red fill, 1px border only, no gradients
- Monospace font throughout
- Bottom: dim red text showing the inefficiency impact

RIGHT column — small label "AFTER" in muted green (#27ae60), uppercase, 11px:
- Fix: ${fix}
- Show single optimised path, minimal steps
- Boxes: very subtle dark green fill, 1px border only, no gradients
- Monospace font throughout
- Bottom: dim green text showing the improvement

Thin 1px vertical divider between columns.

Footer strip, very subtle — monospace, dim colour: "${impact}"

Hard rules — must follow exactly:
- NO large header title anywhere in the image
- NO thick coloured borders or solid colour blocks
- NO drop shadows, gradients, or illustration icons
- NO infographic styling
- Monospace font (JetBrains Mono or similar) for all text
- Looks like a GitHub dark-mode diff or a terminal split-pane — not a slide or poster
- Maximum information, minimum visual noise`

  try {
    const response = await metaClient.images.generate({
      model: MODELS.image,
      prompt,
      n: 1,
      size: '1024x1024'
    })

    const item = response.data?.[0]
    const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null)
    res.status(200).json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Visualisation failed'
    res.status(500).json({ error: message })
  }
}
