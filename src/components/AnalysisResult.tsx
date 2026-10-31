import { useState, useRef } from 'react'
import type { Finding } from './QueryAnalyzer'
import VoiceInput from './VoiceInput'
import { analytics } from '../utils/analytics'
import './AnalysisResult.css'

interface Props {
  finding: Finding
  visualUrl?: string
  visualLoading?: boolean
  modelUsed?: string
  lang?: string
}

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW'
}

export default function AnalysisResult({ finding, visualUrl, visualLoading, modelUsed, lang = 'typescript' }: Props) {
  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState('')
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [usedVoice, setUsedVoice] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [cooldownKey, setCooldownKey] = useState(0)
  const rawRef = useRef('')
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function askFollowUp(q: string) {
    const trimmed = q.trim()
    if (!trimmed || askLoading) return
    setAskLoading(true)
    setAskedQuestion(trimmed)
    setAnswer('')
    setAskError('')
    rawRef.current = ''

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding, question: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Follow-up failed')
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          const payload = JSON.parse(line.slice(6))
          if (payload.error) throw new Error(payload.error)
          if (payload.text) { rawRef.current += payload.text; setAnswer(rawRef.current) }
        }
      }
    } catch (err) {
      setAskError(err instanceof Error ? err.message : 'Follow-up failed')
    } finally {
      setAskLoading(false)
      let secs = 10
      setCooldown(secs)
      setCooldownKey(k => k + 1)
      cooldownRef.current = setInterval(() => {
        secs--
        setCooldown(secs)
        if (secs <= 0) { clearInterval(cooldownRef.current!); cooldownRef.current = null }
      }, 1000)
    }
  }

  function handleVoiceTranscript(text: string) {
    const q = text.trim()
    setQuestion(q)
    setUsedVoice(true)
    if (q) askFollowUp(q)
  }

  function parseAnswer(text: string) {
    const parts: Array<{ type: 'prose' | 'code'; content: string; lang?: string }> = []
    const regex = /```(\w*)?\n?([\s\S]*?)```/g
    let last = 0, match
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push({ type: 'prose', content: text.slice(last, match.index).trim() })
      parts.push({ type: 'code', lang: match[1] || undefined, content: match[2].trim() })
      last = match.index + match[0].length
    }
    if (last < text.length) {
      const rest = text.slice(last).trim()
      if (rest) parts.push({ type: 'prose', content: rest })
    }
    return parts
  }

  return (
    <div className="result">
      <div className="result-header">
        <span className={`severity-badge severity-${finding.severity}`}>
          {SEVERITY_LABEL[finding.severity]}
        </span>
        <h2 className="problem">{finding.problem}</h2>
        <p className="impact-chip">⚡ {finding.impact_estimate}</p>
      </div>

      <p className="explanation">{finding.explanation}</p>

      <div className="code-sections">
        <Section label="Problematic Code" code={finding.sql_generated} lang={lang} variant="bad" />
        {finding.fixed_query !== 'N/A' && (
          <Section label="Fixed Code" code={finding.fixed_query} lang={lang} variant="good" />
        )}
        {finding.migration && (
          <Section label="Migration Script" code={finding.migration} lang="sql" variant="neutral" />
        )}
      </div>

      {modelUsed && (
        <div className="model-attribution">
          <span className="attribution-item">
            <span className="attribution-label">Analyzed by</span>
            <span className="attribution-model">{modelUsed}</span>
          </span>
        </div>
      )}

      <div className="followup">
        <div className="followup-header">
          <span className="followup-label">Ask a follow-up</span>
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={askLoading || cooldown > 0}
            hideHint={true}
            onRecordingChange={setVoiceRecording}
          />
        </div>
        <div className="followup-input-row">
          <input
            className="followup-input"
            type="text"
            placeholder='e.g. "How bad does this get at 10,000 users?"'
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askFollowUp(question)}
            disabled={askLoading || voiceRecording || cooldown > 0}
          />
          <button
            className="followup-ask-btn"
            onClick={() => askFollowUp(question)}
            disabled={askLoading || voiceRecording || cooldown > 0 || !question.trim()}
          >
            {askLoading ? 'Asking...' : 'Ask →'}
          </button>
        </div>
        {cooldown > 0 && (
          <div className="cooldown-wrap">
            <div className="cooldown-meta">
              <span className="cooldown-label">Cooling down</span>
              <span className="cooldown-secs">{cooldown}s</span>
            </div>
            <div className="cooldown-bar">
              <div key={cooldownKey} className="cooldown-fill" />
            </div>
          </div>
        )}
        {askError && <p className="followup-error">{askError}</p>}
        {(askedQuestion || answer) && (
          <div className="followup-answer">
            {askedQuestion && <p className="followup-question">"{askedQuestion}"</p>}
            {askLoading && !answer && <p className="followup-thinking">Thinking...</p>}
            {answer && (
              <div className="followup-answer-body">
                {askLoading
                  ? <p className="followup-answer-text">{answer}</p>
                  : parseAnswer(answer).map((part, i) =>
                      part.type === 'code'
                        ? <div key={i} className="followup-code-block">
                            {part.lang && <span className="followup-code-lang">{part.lang}</span>}
                            <pre><code>{part.content}</code></pre>
                          </div>
                        : <p key={i} className="followup-answer-text">{part.content}</p>
                    )
                }
              </div>
            )}
            {!askLoading && answer && (
              <div className="followup-attribution">
                {usedVoice && <span className="attribution-model">muse-voice-transcribe-1.0</span>}
                {usedVoice && <span className="followup-attr-sep">→</span>}
                <span className="attribution-model">muse-spark-1.3</span>
              </div>
            )}
          </div>
        )}
      </div>

      {visualLoading && !visualUrl && (
        <div className="visual">
          <p className="visual-label">Execution Plan · Before vs After</p>
          <div className="visual-skeleton">
            <div className="skeleton-shimmer" />
            <p className="skeleton-label">Generating visual · ~20–40 sec</p>
          </div>
        </div>
      )}
      {visualUrl && (
        <div className="visual">
          <p className="visual-label">Execution Plan · Before vs After</p>
          <img src={visualUrl} alt="Query execution plan comparison" />
          <p className="visual-model-credit">Visual by <span className="attribution-model">muse-image-1.0</span></p>
        </div>
      )}
    </div>
  )
}

function Section({ label, code, lang, variant }: {
  label: string; code: string; lang: string; variant: 'bad' | 'good' | 'neutral'
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    analytics.copyCode(label)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`code-section variant-${variant}`}>
      <div className="section-header">
        <span className="section-label">{label}</span>
        <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre><code className={`language-${lang}`}>{code}</code></pre>
    </div>
  )
}
