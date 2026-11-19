import { useApiKey, isMetaProvider } from '../contexts/ApiKeyContext'
import './GenerateVisualButton.css'

interface Props {
  onClick: () => void
  error?: string
}

// "Generate Execution Plan" button. Muse Image is Meta-only, so with another
// provider it shows a short note instead of a button that would fail.
export default function GenerateVisualButton({ onClick, error }: Props) {
  const { provider } = useApiKey()

  if (!isMetaProvider(provider)) {
    return <p className="visual-unavailable">Execution plan diagrams are available with a Meta API key.</p>
  }

  return (
    <div className="generate-visual">
      <button className="btn-generate-visual" onClick={onClick}>
        Generate Execution Plan
      </button>
      {error && <span className="visual-error">{error}</span>}
    </div>
  )
}
