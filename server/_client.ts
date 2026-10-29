import OpenAI from 'openai'

export const metaClient = new OpenAI({
  apiKey: process.env.META_MODEL_API_KEY,
  baseURL: 'https://api.meta.ai/v1'
})

export const MODELS = {
  balanced: 'muse-spark-1.3',            // default — no training on user data
  deep: 'muse-wonder-1.0',               // large repos / deep analysis
  economy: 'muse-spark-1.3-contributor', // opt-in only — open-weight, may train
  image: 'muse-image-1.0',
  voice: 'muse-voice-transcribe-1.0'
} as const

export const MODEL_TIERS: Record<string, string> = {
  balanced: MODELS.balanced,
  deep: MODELS.deep,
  economy: MODELS.economy,
}
