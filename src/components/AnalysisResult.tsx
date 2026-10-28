import { useState } from 'react'
import type { Finding } from './QueryAnalyzer'
import { analytics } from '../utils/analytics'
import './AnalysisResult.css'

interface Props {
  finding: Finding
  visualUrl?: string
  visualLoading?: boolean
  modelUsed?: string
}

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW'
}

export default function AnalysisResult({ finding, visualUrl, visualLoading, modelUsed }: Props) {
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
        <Section label="SQL Being Generated" code={finding.sql_generated} lang="sql" variant="bad" />
        <Section label="Fixed ORM Query" code={finding.fixed_query} lang="typescript" variant="good" />
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
