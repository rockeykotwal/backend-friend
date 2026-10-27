import type { Finding } from './QueryAnalyzer'
import './AnalysisResult.css'

interface Props {
  finding: Finding
  visualUrl?: string
  visualLoading?: boolean
}

const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW'
}

export default function AnalysisResult({ finding, visualUrl, visualLoading }: Props) {
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

      {visualLoading && !visualUrl && (
        <div className="visual">
          <p className="visual-label">Execution Plan · Before vs After</p>
          <div className="visual-skeleton">
            <div className="skeleton-shimmer" />
            <p className="skeleton-label">Generating visual · ~5–10 sec</p>
          </div>
        </div>
      )}
      {visualUrl && (
        <div className="visual">
          <p className="visual-label">Execution Plan · Before vs After</p>
          <img src={visualUrl} alt="Query execution plan comparison" />
        </div>
      )}
    </div>
  )
}

function Section({ label, code, lang, variant }: {
  label: string; code: string; lang: string; variant: 'bad' | 'good' | 'neutral'
}) {
  function copy() { navigator.clipboard.writeText(code) }
  return (
    <div className={`code-section variant-${variant}`}>
      <div className="section-header">
        <span className="section-label">{label}</span>
        <button className="copy-btn" onClick={copy}>Copy</button>
      </div>
      <pre><code className={`language-${lang}`}>{code}</code></pre>
    </div>
  )
}
