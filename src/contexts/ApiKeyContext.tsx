import { createContext, useContext } from 'react'

export type ProviderId = 'meta' | 'openai' | 'deepseek' | 'anthropic'

interface ApiKeyContextValue {
  apiKey: string
  provider: ProviderId
}

export const ApiKeyContext = createContext<ApiKeyContextValue>({ apiKey: '', provider: 'meta' })

export const useApiKey = () => useContext(ApiKeyContext)

// Voice input and execution plan diagrams use Meta-only models (Muse Voice, Muse Image),
// so they run on the user's own Meta key and are unavailable with other providers.
export const isMetaProvider = (provider: ProviderId) => provider === 'meta'
