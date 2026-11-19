import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

export type ProviderId = 'meta' | 'openai' | 'deepseek' | 'anthropic'

export interface ChatStreamParams {
  system: string
  userContent: string
  tier: string
}

export interface LLMProvider {
  streamChat(params: ChatStreamParams): Promise<AsyncIterable<string>>
  resolveModel(tier: string): string
}

// ─── OpenAI-compatible providers (Meta, OpenAI, DeepSeek) ────────────────────

interface OAIConfig {
  baseURL: string
  defaultModel: string
  deepModel: string
  economyModel?: string
}

const OAI_CONFIGS: Record<Exclude<ProviderId, 'anthropic'>, OAIConfig> = {
  meta: {
    baseURL: 'https://api.meta.ai/v1',
    defaultModel: 'muse-spark-1.3',
    deepModel: 'muse-wonder-1.0',
    economyModel: 'muse-spark-1.3-contributor',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    deepModel: 'gpt-4o',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    deepModel: 'deepseek-reasoner',
  },
}

class OAIProvider implements LLMProvider {
  constructor(private client: OpenAI, private config: OAIConfig) {}

  resolveModel(tier: string): string {
    if (tier === 'deep') return this.config.deepModel
    if (tier === 'economy') return this.config.economyModel ?? this.config.defaultModel
    return this.config.defaultModel
  }

  async streamChat({ system, userContent, tier }: ChatStreamParams): Promise<AsyncIterable<string>> {
    const stream = await this.client.chat.completions.create({
      model: this.resolveModel(tier),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      stream: true,
    })
    async function* gen() {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) yield text
      }
    }
    return gen()
  }
}

// ─── Anthropic (Claude) ───────────────────────────────────────────────────────

const ANTHROPIC_MODELS = {
  default: 'claude-sonnet-4-6',   // balanced
  deep: 'claude-opus-4-7',        // deep analysis
}

class AnthropicProvider implements LLMProvider {
  constructor(private client: Anthropic) {}

  resolveModel(tier: string): string {
    return tier === 'deep' ? ANTHROPIC_MODELS.deep : ANTHROPIC_MODELS.default
  }

  async streamChat({ system, userContent, tier }: ChatStreamParams): Promise<AsyncIterable<string>> {
    const stream = this.client.messages.stream({
      model: this.resolveModel(tier),
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userContent }],
    })
    async function* gen() {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text
        }
      }
    }
    return gen()
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createProvider(provider: ProviderId, apiKey: string): LLMProvider {
  if (provider === 'anthropic') {
    return new AnthropicProvider(new Anthropic({ apiKey }))
  }
  const config = OAI_CONFIGS[provider]
  return new OAIProvider(new OpenAI({ apiKey, baseURL: config.baseURL }), config)
}

export function isValidProvider(id: string): id is ProviderId {
  return ['meta', 'openai', 'deepseek', 'anthropic'].includes(id)
}
