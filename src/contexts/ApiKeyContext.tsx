import { createContext, useContext } from 'react'

export type ProviderId = 'meta' | 'openai' | 'deepseek' | 'anthropic'

interface ApiKeyContextValue {
  apiKey: string
  provider: ProviderId
}

export const ApiKeyContext = createContext<ApiKeyContextValue>({ apiKey: '', provider: 'meta' })

export const useApiKey = () => useContext(ApiKeyContext)
