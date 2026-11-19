import { decryptApiKey } from '../crypto/session.js'
import { createProvider, isValidProvider, type ProviderId, type LLMProvider } from '../providers/index.js'

// Thrown when the user's provider can't do what was asked (e.g. image generation with Claude)
export class ProviderNotSupportedError extends Error {}

export function resolveClient(body: Record<string, unknown>): LLMProvider {
  const { encryptedKey, provider: rawProvider } = body

  if (typeof encryptedKey === 'string' && encryptedKey) {
    const provider: ProviderId = isValidProvider(String(rawProvider)) ? (rawProvider as ProviderId) : 'meta'
    const apiKey = decryptApiKey(encryptedKey)
    return createProvider(provider, apiKey)
  }

  throw new Error('No API key provided. Please add your API key above to continue.')
}

// For Meta-only features (Muse Image, Muse Voice): returns the user's own Meta key.
// The server never falls back to a key of its own.
export function resolveMetaKey(body: Record<string, unknown>, feature: string): string {
  const { encryptedKey, provider } = body

  if (typeof encryptedKey !== 'string' || !encryptedKey) {
    throw new Error('No API key provided. Please add your API key above to continue.')
  }
  if (provider !== 'meta') {
    throw new ProviderNotSupportedError(`${feature} needs a Meta API key`)
  }
  return decryptApiKey(encryptedKey)
}

// Maps a key-resolution error to the HTTP response the routes send
export function keyErrorResponse(err: unknown): { status: number; error: string } {
  if (err instanceof ProviderNotSupportedError) return { status: 400, error: err.message }
  return { status: 401, error: 'Invalid or expired API key session — please re-enter your key and try again.' }
}
