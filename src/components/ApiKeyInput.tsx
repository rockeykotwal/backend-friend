import { useState } from 'react'
import type { ProviderId } from '../contexts/ApiKeyContext'
import './ApiKeyInput.css'

interface Props {
  apiKey: string
  setApiKey: (k: string) => void
  provider: ProviderId
  setProvider: (p: ProviderId) => void
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  meta: 'Meta Model API',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  anthropic: 'Claude (Anthropic)',
}

const PROVIDER_PLACEHOLDERS: Record<ProviderId, string> = {
  meta: 'Paste your Meta API key',
  openai: 'sk-…',
  deepseek: 'sk-…',
  anthropic: 'sk-ant-…',
}

export default function ApiKeyInput({ apiKey, setApiKey, provider, setProvider }: Props) {
  const [show, setShow] = useState(false)
  const hasKey = apiKey.trim().length > 0

  return (
    <div className={`api-key-bar${hasKey ? ' api-key-bar--active' : ''}`}>
      <span className="api-key-label">API key</span>

      <select
        className="api-key-provider"
        value={provider}
        onChange={e => setProvider(e.target.value as ProviderId)}
        aria-label="LLM provider"
      >
        {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map(p => (
          <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
        ))}
      </select>

      <div className="api-key-field">
        <input
          className="api-key-input"
          type={show ? 'text' : 'password'}
          placeholder={`${PROVIDER_PLACEHOLDERS[provider]} (optional — uses our shared key if blank)`}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="api-key-toggle"
          onClick={() => setShow(s => !s)}
          type="button"
          aria-label={show ? 'Hide key' : 'Show key'}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>

      {hasKey
        ? <span className="api-key-status api-key-status--own">Your key · encrypted in browser</span>
        : <span className="api-key-status">Paste your key to get started</span>
      }
    </div>
  )
}
