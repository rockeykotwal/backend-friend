import { useState, useRef } from 'react'
import type { Finding } from './QueryAnalyzer'
import AnalysisResult from './AnalysisResult'
import { extractOrmBlocks, LANGUAGE_GROUPS } from '../utils/extractOrmBlocks'
import { analytics } from '../utils/analytics'
import './AgentScanner.css'

interface AgentFinding extends Finding {
  file: string
  line: number | null
}

function cleanJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return m ? m[1] : raw.trim()
}

export default function AgentScanner() {
  const [mode, setMode] = useState<'github' | 'upload'>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [findings, setFindings] = useState<AgentFinding[]>([])
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const rawRef = useRef('')

  function reset() {
    setFindings([])
    setError('')
    setSelected(null)
    rawRef.current = ''
  }

  // Shared SSE reader used by both scan paths
  async function readAgentStream(res: Response) {
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
        if (payload.progress) { setProgress(payload.progress); continue }
        if (payload.text) rawRef.current += payload.text
      }
    }
  }

  async function scanGithub() {
    if (!repoUrl.trim()) return
    setLoading(true)
    reset()
    setProgress('Connecting to GitHub...')
    analytics.scanGithub()

    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl.trim() })
      })
      await readAgentStream(res)
      finalise()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub scan failed')
    } finally {
      setLoading(false)
    }
  }

  async function scanUpload() {
    if (!files?.length) return
    setLoading(true)
    reset()
    setProgress('Reading files...')

    const sourceFiles = Array.from(files).filter(f => {
      const path = f.webkitRelativePath || f.name
      return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|java|kt|rb|php|cs|rs)$/.test(f.name)
        && !path.includes('node_modules')
        && !path.includes('/vendor/')
        && !path.includes('/target/')
    })

    if (!sourceFiles.length) {
      setError('No backend source files found.')
      setLoading(false)
      return
    }

    setProgress(`Reading ${sourceFiles.length} files...`)
    const rawContents = await Promise.all(
      sourceFiles.map(async f => ({ path: f.webkitRelativePath || f.name, content: await f.text() }))
    )

    const extracted = rawContents
      .map(f => extractOrmBlocks(f.path, f.content))
      .filter(Boolean) as NonNullable<ReturnType<typeof extractOrmBlocks>>[]

    if (!extracted.length) {
      setError('No ORM queries detected. Backend Friend supports SQLAlchemy, Django ORM, GORM, Prisma, TypeORM, and more.')
      setLoading(false)
      return
    }

    const totalOriginal = rawContents.reduce((s, f) => s + f.content.split('\n').length, 0)
    const totalExtracted = extracted.reduce((s, f) => s + f.extractedLines, 0)
    setProgress(`Found ORM queries in ${extracted.length} files (${totalExtracted} relevant lines from ${totalOriginal.toLocaleString()} total) — analysing...`)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: extracted.map(f => ({ path: f.path, content: f.content })) })
      })
      await readAgentStream(res)
      finalise()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  function finalise() {
    const parsed: AgentFinding[] = JSON.parse(cleanJson(rawRef.current))
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    setFindings(parsed.sort((a, b) => order[a.severity] - order[b.severity]))
    analytics.scanResult(parsed.length)
    setProgress('')
  }

  const canScan = mode === 'github' ? repoUrl.trim().length > 0 : !!files?.length

  return (
    <div className="scanner">
      <div className="scanner-intro">
        <h2>Scan Your Codebase</h2>
        <p>Your codebase has database bugs you don't know about yet. Let's find them.</p>
        <div className="lang-support">
          <div className="orm-list">
            {LANGUAGE_GROUPS.map(g => (
              <span key={g.language} className="lang-chip" title={g.orms.join(', ')}>{g.language}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="scan-tabs">
        <button
          className={`scan-tab ${mode === 'github' ? 'active' : ''}`}
          onClick={() => setMode('github')}
        >
          GitHub URL
        </button>
        <button
          className={`scan-tab ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          Upload Folder
        </button>
      </div>

      {/* GitHub input */}
      {mode === 'github' && (
        <div className="file-row">
          <input
            className="github-url-input"
            type="text"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && canScan && scanGithub()}
          />
          <button className="btn-scan" onClick={scanGithub} disabled={loading || !canScan}>
            {loading ? 'Scanning...' : 'Scan →'}
          </button>
        </div>
      )}

      {/* Upload input */}
      {mode === 'upload' && (
        <div className="file-row">
          <label className="file-picker">
            <input
              type="file"
              multiple
              // @ts-ignore — webkitdirectory is non-standard but supported in all major browsers
              webkitdirectory=""
              onChange={e => setFiles(e.target.files)}
            />
            {files ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'Select folder'}
          </label>
          <button className="btn-scan" onClick={scanUpload} disabled={loading || !canScan}>
            {loading ? 'Scanning...' : 'Scan →'}
          </button>
        </div>
      )}

      {progress && <div className="progress"><span className="progress-dot" />{progress}</div>}
      {error && <div className="error">{error}</div>}

      {findings.length > 0 && (
        <>
          <div className="findings-summary">
            <span>Found <strong>{findings.length}</strong> issue{findings.length !== 1 ? 's' : ''}</span>
            {(['critical', 'high', 'medium', 'low'] as const).map(s => {
              const count = findings.filter(f => f.severity === s).length
              return count > 0
                ? <span key={s} className={`summary-chip severity-${s}`}>{count} {s}</span>
                : null
            })}
          </div>

          <div className="findings-list">
            {findings.map((f, i) => (
              <div key={i} className={`finding-row ${selected === i ? 'expanded' : ''}`}>
                <button className="finding-header" onClick={() => setSelected(selected === i ? null : i)}>
                  <span className={`severity-dot severity-${f.severity}`} />
                  <span className="finding-file">{f.file}{f.line ? `:${f.line}` : ''}</span>
                  <span className="finding-problem">{f.problem}</span>
                  <span className="finding-chevron">{selected === i ? '▲' : '▼'}</span>
                </button>
                {selected === i && (
                  <div className="finding-detail">
                    <AnalysisResult finding={f} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
