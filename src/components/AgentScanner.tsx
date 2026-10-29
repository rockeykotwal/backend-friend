import { useState, useRef } from 'react'
import type { Finding } from './QueryAnalyzer'
import AnalysisResult from './AnalysisResult'
import { extractOrmBlocks, detectRawDbUsage, LANGUAGE_GROUPS } from '../utils/extractOrmBlocks'
import { analytics } from '../utils/analytics'
import './AgentScanner.css'

interface AgentFinding extends Finding {
  file: string
  line: number | null
}

type ScanStatus = 'idle' | 'issues_found' | 'clean' | 'unsupported_orm' | 'no_db_access'

interface ScanStats {
  fileCount: number
  queryCount: number
  detectedLanguages: string[]
}

function cleanJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return m ? m[1] : raw.trim()
}

function langFromPath(filePath: string): string {
  if (/\.(ts|tsx)$/.test(filePath)) return 'typescript'
  if (/\.(js|jsx|mjs|cjs)$/.test(filePath)) return 'javascript'
  if (/\.py$/.test(filePath)) return 'python'
  if (/\.go$/.test(filePath)) return 'go'
  if (/\.(java|kt)$/.test(filePath)) return 'java'
  if (/\.rb$/.test(filePath)) return 'ruby'
  if (/\.php$/.test(filePath)) return 'php'
  if (/\.cs$/.test(filePath)) return 'csharp'
  if (/\.rs$/.test(filePath)) return 'rust'
  return 'sql'
}

export default function AgentScanner() {
  const [mode, setMode] = useState<'github' | 'upload'>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [findings, setFindings] = useState<AgentFinding[]>([])
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scanStats, setScanStats] = useState<ScanStats | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [scanModel, setScanModel] = useState('')
  const [visuals, setVisuals] = useState<Record<number, { loading: boolean; url: string }>>({})
  const rawRef = useRef('')

  function reset() {
    setFindings([])
    setScanStatus('idle')
    setScanStats(null)
    setError('')
    setSelected(null)
    setScanModel('')
    setVisuals({})
    rawRef.current = ''
  }

  async function generateVisual(finding: AgentFinding, index: number) {
    setVisuals(v => ({ ...v, [index]: { loading: true, url: '' } }))
    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: finding.problem, fix: finding.fixed_query, impact: finding.impact_estimate })
      })
      const { url } = await res.json()
      setVisuals(v => ({ ...v, [index]: { loading: false, url: url ?? '' } }))
    } catch {
      setVisuals(v => ({ ...v, [index]: { loading: false, url: '' } }))
    }
  }

  // Shared SSE reader used by both scan paths
  async function readAgentStream(res: Response) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Something went wrong — please try again.')
    }
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
        if (payload.model) { setScanModel(payload.model); continue }
        if (payload.status) { setScanStatus(payload.status as ScanStatus); continue }
        if (payload.scanStats) { setScanStats(payload.scanStats as ScanStats); continue }
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
      if (rawRef.current) finalise()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub scan failed')
    } finally {
      setLoading(false)
      setProgress('')
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
      setScanStatus('no_db_access')
      setScanStats({ fileCount: Array.from(files).length, queryCount: 0, detectedLanguages: [] })
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
      const hasRawDb = detectRawDbUsage(rawContents)
      setScanStatus(hasRawDb ? 'unsupported_orm' : 'no_db_access')
      setScanStats({ fileCount: rawContents.length, queryCount: 0, detectedLanguages: [] })
      setLoading(false)
      return
    }

    const totalOriginal = rawContents.reduce((s, f) => s + f.content.split('\n').length, 0)
    const totalExtracted = extracted.reduce((s, f) => s + f.extractedLines, 0)
    setScanStats({
      fileCount: extracted.length,
      queryCount: extracted.reduce((s, f) => s + f.ormHitCount, 0),
      detectedLanguages: [...new Set(extracted.map(f => f.detectedLanguage))],
    })
    setProgress(`Found database queries in ${extracted.length} files (${totalExtracted} relevant lines from ${totalOriginal.toLocaleString()} total) — analysing...`)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: extracted.map(f => ({ path: f.path, content: f.content })) })
      })
      await readAgentStream(res)
      if (rawRef.current) finalise()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  function finalise() {
    const parsed: AgentFinding[] = JSON.parse(cleanJson(rawRef.current))
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    setFindings(parsed.sort((a, b) => order[a.severity] - order[b.severity]))
    setScanStatus(parsed.length > 0 ? 'issues_found' : 'clean')
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
            disabled={loading}
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
              // @ts-expect-error — webkitdirectory is non-standard but supported in all major browsers
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

      {scanStatus === 'clean' && !error && (
        <div className="scan-status-card status-clean">
          <span className="status-icon">✓</span>
          <div>
            <p className="status-title">No database issues found</p>
            <p className="status-body">
              {scanStats
                ? `Backend Friend scanned ${scanStats.queryCount} queries across ${scanStats.fileCount} files and found no N+1 queries, missing indexes, or inefficient operations.`
                : 'Backend Friend analyzed this codebase and found no database issues.'}
            </p>
          </div>
        </div>
      )}

      {scanStatus === 'unsupported_orm' && !error && (
        <div className="scan-status-card status-unsupported">
          <span className="status-icon">!</span>
          <div>
            <p className="status-title">Database library not supported yet</p>
            <p className="status-body">
              This project accesses a database, but not through a library Backend Friend currently supports.
            </p>
            <p className="status-supported">
              Supported: {LANGUAGE_GROUPS.map(g => g.language).join(', ')}
            </p>
          </div>
        </div>
      )}

      {scanStatus === 'no_db_access' && !error && (
        <div className="scan-status-card status-info">
          <span className="status-icon">○</span>
          <div>
            <p className="status-title">No database queries found</p>
            <p className="status-body">
              {scanStats?.fileCount
                ? `Backend Friend scanned ${scanStats.fileCount} files and found no database usage, so there's nothing to analyze.`
                : 'Backend Friend found no database usage in this codebase.'}
              {' '}This is expected for frontend apps, libraries, and CLI tools.
            </p>
          </div>
        </div>
      )}

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
            {scanModel && (
              <span className="scan-model-attribution">
                Analyzed by <span className="attribution-model">{scanModel}</span>
              </span>
            )}
          </div>

          <div className="findings-list">
            {findings.map((f, i) => (
              <div key={i} className={`finding-row ${selected === i ? 'expanded' : ''}`}>
                <button className="finding-header" onClick={() => setSelected(selected === i ? null : i)}>
                  <span className={`severity-dot severity-${f.severity}`} />
                  <span className="finding-file">{(() => {
                    const short = f.file.split('/').slice(-2).join('/')
                    const slash = short.lastIndexOf('/')
                    const dir = slash > 0 ? short.slice(0, slash + 1) : ''
                    const basename = slash > 0 ? short.slice(slash + 1) : short
                    return <>{dir && <span className="finding-file-dir">{dir}</span>}<span className="finding-file-name">{basename}</span>{f.line && <span className="finding-file-line">:{f.line}</span>}</>
                  })()}</span>
                  <span className="finding-problem">{f.problem}</span>
                  <span className="finding-chevron">{selected === i ? '▲' : '▼'}</span>
                </button>
                <div className={`finding-detail${selected === i ? '' : ' hidden'}`}>
                  <AnalysisResult
                    finding={f}
                    visualUrl={visuals[i]?.url}
                    visualLoading={visuals[i]?.loading}
                    lang={langFromPath(f.file)}
                  />
                  {f.fixed_query !== 'N/A' && !visuals[i]?.url && !visuals[i]?.loading && (
                    <button className="btn-generate-visual" onClick={() => generateVisual(f, i)}>
                      Generate Execution Plan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  )
}
