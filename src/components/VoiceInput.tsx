import { useState, useRef } from 'react'
import { analytics } from '../utils/analytics'
import './VoiceInput.css'

interface Props {
  onTranscript: (text: string) => void
}

// Encode raw PCM Float32 samples into a WAV ArrayBuffer (RIFF/PCM, 16-bit, mono)
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buf)
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)           // PCM
  view.setUint16(22, 1, true)           // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let off = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  return buf
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export default function VoiceInput({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ctxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Float32Array[]>([])

  async function start() {
    setError('')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Mic access denied')
      return
    }

    streamRef.current = stream
    // 16 kHz is ideal for speech — less data, plenty for recognition
    const ctx = new AudioContext({ sampleRate: 16000 })
    ctxRef.current = ctx
    chunksRef.current = []

    const source = ctx.createMediaStreamSource(stream)
    sourceRef.current = source
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = e => {
      chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    }

    source.connect(processor)
    processor.connect(ctx.destination)
    setRecording(true)
    analytics.voiceStart()
  }

  async function stop() {
    setRecording(false)
    setLoading(true)

    const sampleRate = ctxRef.current?.sampleRate ?? 16000
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach(t => t.stop())
    await ctxRef.current?.close()

    // Merge all PCM chunks and encode to WAV
    const chunks = chunksRef.current
    const total = chunks.reduce((s, c) => s + c.length, 0)
    const combined = new Float32Array(total)
    let offset = 0
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length }

    const audio = toBase64(encodeWav(combined, sampleRate))

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio })
      })
      const { text, error: apiError } = await res.json()
      if (apiError) setError('Transcription failed')
      else if (text) { onTranscript(' ' + text); analytics.voiceTranscribed() }
    } catch {
      setError('Transcription failed')
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    if (recording) stop()
    else start()
  }

  return (
    <span className="voice-wrap">
      {!recording && !loading && !error && (
        <span className="voice-hint">Prefer not to type?</span>
      )}
      <button
        className={`voice-btn ${recording ? 'recording' : ''}`}
        onClick={toggle}
        disabled={loading}
        title="Describe your query by voice — Muse Voice Transcribe converts it to text"
      >
        {loading ? 'Transcribing...' : recording ? '⏹ Stop' : '🎤 Describe by voice'}
      </button>
      {error && <span className="voice-error">{error}</span>}
    </span>
  )
}
