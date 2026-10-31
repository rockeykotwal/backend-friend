import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'
import type { Finding } from '../../src/components/QueryAnalyzer.js'

const FOLLOWUP_SYSTEM_PROMPT = `You are Backend Friend's follow-up assistant. A developer has received a database performance finding and has a question about it.

Answer directly and practically. Target 2–4 sentences. Use plain text. If showing code, wrap it in triple backticks with the language identifier on the opening fence.

Rules:
- Do not restate the question
- Do not add preamble like "Great question" or "Sure!"
- No markdown headings or bullet lists — just clear prose or a short code block
- If giving a scale estimate, use concrete numbers`

export async function followupHandler(req: Request, res: Response) {
  const { finding, question } = req.body as { finding: Finding; question: string }
  if (!finding || !question?.trim()) {
    return res.status(400).json({ error: 'finding and question are required' })
  }

  const userMessage = `Finding (${finding.severity}): ${finding.problem}

${finding.explanation}

${finding.fixed_query !== 'N/A' ? `Fixed code:\n\`\`\`\n${finding.fixed_query}\n\`\`\`` : ''}

Developer's question: ${question.trim()}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const emit = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  try {
    const stream = await metaClient.chat.completions.create({
      model: MODELS.balanced,
      messages: [
        { role: 'system', content: FOLLOWUP_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) emit({ text })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Follow-up failed'
    if (res.headersSent) {
      emit({ error: message })
      res.end()
    } else {
      res.status(500).json({ error: message })
    }
  }
}
