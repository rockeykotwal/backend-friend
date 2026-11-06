import { decryptApiKey } from '../crypto/session.js'
import { createProvider, isValidProvider, type ProviderId, type LLMProvider } from '../providers/index.js'

const serverMetaProvider: LLMProvider = createProvider('meta', process.env.META_MODEL_API_KEY ?? '')

export function resolveClient(body: Record<string, unknown>): LLMProvider {
  const { sessionToken, encryptedKey, provider: rawProvider } = body

  if (
    typeof sessionToken === 'string' && sessionToken &&
    typeof encryptedKey === 'string' && encryptedKey
  ) {
    const provider: ProviderId = isValidProvider(String(rawProvider)) ? (rawProvider as ProviderId) : 'meta'
    const apiKey = decryptApiKey(sessionToken, encryptedKey)
    return createProvider(provider, apiKey)
  }

  return serverMetaProvider
}
