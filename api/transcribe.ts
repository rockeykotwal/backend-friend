import type { VercelRequest, VercelResponse } from '@vercel/node'
import { metaClient, MODELS } from './_client'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { audio } = req.body as { audio: string }
  if (!audio) return res.status(400).json({ error: 'audio (base64) is required' })

  try {
    const audioBuffer = Buffer.from(audio, 'base64')
    const audioFile = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' })

    const transcription = await metaClient.audio.transcriptions.create({
      model: MODELS.voice,
      file: audioFile
    })

    res.status(200).json({ text: transcription.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    res.status(500).json({ error: message })
  }
}
