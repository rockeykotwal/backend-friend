import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'

export async function transcribeHandler(req: Request, res: Response) {
  const { audio } = req.body as { audio: string }
  if (!audio) return res.status(400).json({ error: 'audio (base64) is required' })

  try {
    const audioBuffer = Buffer.from(audio, 'base64')
    const audioFile = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' })

    const transcription = await metaClient.audio.transcriptions.create({
      model: MODELS.voice,
      file: audioFile
    })

    if (!transcription.text) return res.status(200).json({ text: '' })
    res.status(200).json({ text: transcription.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    // Transcription failing is non-fatal — return empty text so the UI degrades gracefully
    res.status(200).json({ text: '', error: message })
  }
}
