import type { Finding } from '../types/finding'
import type { ProviderId } from '../contexts/ApiKeyContext'
import { encryptApiKey } from './crypto'

// Generates the before/after execution plan diagram with Muse Image, on the user's own Meta key.
// Resolves to the image URL; throws with a user-facing message on failure.
export async function requestExecutionPlan(finding: Finding, apiKey: string, provider: ProviderId): Promise<string> {
  if (!apiKey.trim()) throw new Error('Add your Meta API key to generate diagrams.')

  const { encryptedKey } = await encryptApiKey(apiKey.trim())
  const res = await fetch('/api/visualize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problem: finding.problem,
      fix: finding.fixed_query,
      impact: finding.impact_estimate,
      encryptedKey,
      provider,
    }),
  })

  const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not generate the diagram — please try again.')
  return data.url
}
