import { useState, useRef } from 'react'
import type { Finding } from './QueryAnalyzer'
import AnalysisResult from './AnalysisResult'
import { extractOrmBlocks } from '../utils/extractOrmBlocks'
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

    const sourceFiles = Array.from(files).filter(f =>
      /\.(ts|tsx|js|jsx)$/.test(f.name) && !f.webkitRelativePath.includes('node_modules')
    )

    if (!sourceFiles.length) {
      setError('No source files found. Make sure the folder contains .ts / .js / .tsx files.')
      setLoading(false)
      return
    }

    setProgress(`Reading ${sourceFiles.length} files...`)

    const rawContents = await Promise.all(
      sourceFiles.map(async f => ({ path: f.webkitRelativePath || f.name, content: await f.text() }))
    )

    // extract only ORM query blocks — skip test/migration/seed files
    const extracted = rawContents
      .map(f => extractOrmBlocks(f.path, f.content))
      .filter(Boolean) as NonNullable<ReturnType<typeof extractOrmBlocks>>[]

    if (!extracted.length) {
      setError('No ORM queries detected. Backend Friend supports Prisma, TypeORM, Sequelize, and Drizzle.')
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
            // @ts-ignore — webkitdirectory is non-standard but supported in all major browsers
            webkitdirectory=""
            onChange={e => setFiles(e.target.files)}
          />
          {files ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'Select folder'}
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
