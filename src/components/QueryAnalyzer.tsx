import { useState, useRef } from 'react'
import AnalysisResult from './AnalysisResult'
import VoiceInput from './VoiceInput'
import MetaLoader from './MetaLoader'
import { analytics } from '../utils/analytics'
import './QueryAnalyzer.css'
import './MetaLoader.css'

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low'
  problem: string
  explanation: string
  sql_generated: string
  fixed_query: string
  migration: string | null
  impact_estimate: string
}

// Strip markdown code fences the model occasionally adds despite being told not to
function cleanJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return m ? m[1] : raw.trim()
}

export default function QueryAnalyzer() {
  const [query, setQuery] = useState('')
  const [schema, setSchema] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Finding | null>(null)
  const [error, setError] = useState('')
  const [visualUrl, setVisualUrl] = useState('')
  const [visualLoading, setVisualLoading] = useState(false)
  const rawRef = useRef('')

  async function analyze() {
    if (!query.trim() || !schema.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    setVisualUrl('')
    setVisualLoading(false)
    analytics.analyzeQuery(!!schema.trim())
    rawRef.current = ''

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, schema })
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          const payload = JSON.parse(line.slice(6))
          if (payload.error) throw new Error(payload.error)
          rawRef.current += payload.text
        }
      }

      const finding: Finding = JSON.parse(cleanJson(rawRef.current))
      setResult(finding)
      analytics.analyzeResult(finding.severity)
      setVisualLoading(true)
      generateVisual(finding)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  async function generateVisual(finding: Finding) {
    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: finding.problem,
          fix: finding.fixed_query,
          impact: finding.impact_estimate
        })
      })
      const { url } = await res.json()
      if (url) setVisualUrl(url)
    } catch {
      // visual is optional — fail silently
    } finally {
      setVisualLoading(false)
    }
  }

  const LANGS = ['Node.js', 'Python', 'Go', 'Java', 'Ruby', 'PHP', 'C#', 'Rust']

  return (
    <div className="analyzer">
      <div className="lang-pills">
        {LANGS.map(l => <span key={l} className="lang-pill">{l}</span>)}
      </div>
      <div className="inputs">
        <div className="input-group">
          <div className="input-label-row">
            <label>Your Query</label>
            <VoiceInput onTranscript={text => setQuery(prev => prev + text)} />
          </div>
          <textarea
            className="code-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`// e.g. TypeORM, Prisma, Django ORM, GORM, raw SQL...\nconst users = await userRepository.find({\n  relations: ['posts'],\n  where: { active: true },\n});`}
            rows={12}
          />
        </div>

        <div className="input-group">
          <div className="input-label-row">
            <label>Your Schema</label>
          </div>
          <textarea
            className="code-input"
            value={schema}
            onChange={e => setSchema(e.target.value)}
            placeholder={`// e.g. Prisma schema, TypeORM entity, Django model, SQL DDL...\n@Entity()\nexport class User {\n  @PrimaryGeneratedColumn() id: number;\n  @Column() active: boolean;\n  @OneToMany(() => Post, p => p.user) posts: Post[];\n}`}
            rows={12}
          />
        </div>
      </div>

      <button
        className="btn-analyze"
        onClick={analyze}
        disabled={loading || !query.trim() || !schema.trim()}
      >
        {loading ? 'Analyzing...' : 'Analyze Query'}
      </button>

      {loading && <MetaLoader />}
      {error && <div className="error">{error}</div>}
      {result && <AnalysisResult finding={result} visualUrl={visualUrl} visualLoading={visualLoading} />}
    </div>
  )
}
