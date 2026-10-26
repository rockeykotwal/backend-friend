import { useState, useRef } from 'react'
import type { Finding } from './QueryAnalyzer'
import AnalysisResult from './AnalysisResult'
import './AgentScanner.css'

interface AgentFinding extends Finding {
  file: string
  line: number | null
}

export default function AgentScanner() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [findings, setFindings] = useState<AgentFinding[]>([])
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const rawRef = useRef('')

  async function scan() {
    if (!files?.length) return
    setLoading(true)
    setFindings([])
    setError('')
    setSelected(null)
    rawRef.current = ''
    setProgress('Reading files...')

    const tsFiles = Array.from(files).filter(f =>
      f.name.endsWith('.ts') || f.name.endsWith('.js') || f.name.endsWith('.tsx')
    )

    if (!tsFiles.length) {
      setError('No .ts / .js / .tsx files found in selection')
      setLoading(false)
      return
    }

    const fileContents = await Promise.all(
      tsFiles.map(async f => ({ path: f.name, content: await f.text() }))
    )

    setProgress(`Scanning ${fileContents.length} files for ORM queries...`)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileContents })
      })

      const ormCount = res.headers.get('X-Orm-Files-Found')
      if (ormCount) setProgress(`Found ORM queries in ${ormCount} files — analysing...`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          const { text } = JSON.parse(line.slice(6))
          rawRef.current += text
        }
      }

      const parsed: AgentFinding[] = JSON.parse(rawRef.current)
      const sorted = parsed.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        return order[a.severity] - order[b.severity]
      })
      setFindings(sorted)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scanner">
      <div className="scanner-intro">
        <h2>Scan Your Codebase</h2>
        <p>Select your source files. The agent will find every ORM query, analyse them all, and return a prioritised fix list — critical issues first.</p>
      </div>

      <div className="file-row">
        <label className="file-picker">
          <input
            type="file"
            multiple
            accept=".ts,.js,.tsx"
            onChange={e => setFiles(e.target.files)}
          />
          {files ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'Select source files'}
        </label>
        <button className="btn-scan" onClick={scan} disabled={loading || !files?.length}>
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {progress && <div className="progress">{progress}</div>}
      {error && <div className="error">{error}</div>}

      {findings.length > 0 && (
        <>
          <div className="findings-summary">
            <span>Found <strong>{findings.length}</strong> issue{findings.length !== 1 ? 's' : ''}</span>
            {(['critical', 'high', 'medium', 'low'] as const).map(s => {
              const count = findings.filter(f => f.severity === s).length
              return count > 0 ? (
                <span key={s} className={`summary-chip severity-${s}`}>{count} {s}</span>
              ) : null
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
