import type { Request, Response } from 'express'

const TRANSCRIBE_URL = 'https://api.meta.ai/v1/asr/transcribe'

export async function transcribeHandler(req: Request, res: Response) {
  const { audio } = req.body as { audio: string }
  if (!audio) return res.status(400).json({ error: 'audio (base64) is required' })

  try {
    const audioBlob = new Blob([Buffer.from(audio, 'base64')], { type: 'audio/wav' })
    const requestBlob = new Blob(
      [JSON.stringify({ model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', mode: 'PUSH_TO_TALK' })],
      { type: 'application/json' }
    )

    const formData = new FormData()
    formData.append('request', requestBlob)          // inline JSON part — no filename needed
    formData.append('audio', audioBlob, 'recording.wav')

    const response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.META_MODEL_API_KEY}`,
        'Accept': 'application/json'
      },
      body: formData
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`${response.status} ${errText}`)
    }

    // Schema: { sessionId, transcript, audioDurationMs, turns[] }
    const data = await response.json() as { transcript?: string }
    const text = data.transcript?.trim() ?? ''

    res.status(200).json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    // Non-fatal — return empty text so UI degrades gracefully
    res.status(200).json({ text: '', error: message })
  }
}
