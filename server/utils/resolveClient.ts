import { decryptApiKey } from '../crypto/session.js'
import { createProvider, isValidProvider, type ProviderId, type LLMProvider } from '../providers/index.js'

export function resolveClient(body: Record<string, unknown>): LLMProvider {
  const { encryptedKey, provider: rawProvider } = body

  if (typeof encryptedKey === 'string' && encryptedKey) {
    const provider: ProviderId = isValidProvider(String(rawProvider)) ? (rawProvider as ProviderId) : 'meta'
    const apiKey = decryptApiKey(encryptedKey)
    return createProvider(provider, apiKey)
  }

  throw new Error('No API key provided. Please add your API key above to continue.')
}
