import { useState, useRef } from 'react'
import './VoiceInput.css'

interface Props {
  onTranscript: (text: string) => void
}

export default function VoiceInput({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function toggle() {
    if (recording) {
      mediaRef.current?.stop()
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      setRecording(false)
      setLoading(true)

      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const base64 = await blobToBase64(blob)

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 })
        })

        const { text } = await res.json()
        if (text) onTranscript(' ' + text)
      } finally {
        setLoading(false)
      }
    }

    recorder.start()
    mediaRef.current = recorder
    setRecording(true)
  }

  return (
    <button
      className={`voice-btn ${recording ? 'recording' : ''}`}
      onClick={toggle}
      disabled={loading}
      title={recording ? 'Stop recording' : 'Describe your query by voice'}
    >
      {loading ? '...' : recording ? '⏹ Stop' : '🎤'}
    </button>
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
