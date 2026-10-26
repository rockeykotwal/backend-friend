import OpenAI from 'openai'

export const metaClient = new OpenAI({
  apiKey: process.env.META_MODEL_API_KEY,
  baseURL: 'https://api.meta.ai/v1'
})

export const MODELS = {
  spark: 'muse-spark-1.3-contributor',
  wonder: 'muse-wonder-1.0',
  image: 'muse-image-1.0',
  voice: 'muse-voice-transcribe-1.0'
} as const
