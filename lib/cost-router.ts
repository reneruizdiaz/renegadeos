import Anthropic from '@anthropic-ai/sdk'

// ─── Model constants ──────────────────────────────────────────────────────────

export const MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const

export type ModelKey = keyof typeof MODELS

// ─── Task routing table ───────────────────────────────────────────────────────

type TaskType =
  | 'briefing'
  | 'research_sweep'
  | 'session_summary'
  | 'agent_chat'
  | 'status_extract'
  | 'cross_domain'
  | 'weekly_synthesis'

interface RouteConfig {
  model: (typeof MODELS)[ModelKey]
  realtime: boolean
  cache: boolean
}

const ROUTING_TABLE: Record<TaskType, RouteConfig> = {
  briefing:          { model: MODELS.SONNET, realtime: false, cache: false },
  research_sweep:    { model: MODELS.HAIKU,  realtime: false, cache: false },
  session_summary:   { model: MODELS.HAIKU,  realtime: false, cache: false },
  agent_chat:        { model: MODELS.SONNET, realtime: true,  cache: true  },
  status_extract:    { model: MODELS.HAIKU,  realtime: true,  cache: true  },
  cross_domain:      { model: MODELS.SONNET, realtime: true,  cache: true  },
  weekly_synthesis:  { model: MODELS.SONNET, realtime: false, cache: false },
}

// ─── Request builder ──────────────────────────────────────────────────────────

export interface CostRouterParams {
  task: TaskType
  systemPrompt: string
  contextBlock: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
}

export interface RoutedRequest {
  model: string
  system: Anthropic.TextBlockParam[] | string
  messages: Anthropic.MessageParam[]
  max_tokens: number
  stream: boolean
}

export function buildRoutedRequest(params: CostRouterParams): RoutedRequest {
  const { task, systemPrompt, contextBlock, messages, maxTokens = 4096 } = params
  const route = ROUTING_TABLE[task]

  // Build system prompt — optionally with cache_control on the static part
  let system: Anthropic.TextBlockParam[] | string

  if (route.cache) {
    system = [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: contextBlock,
        cache_control: { type: 'ephemeral' },
      },
    ]
  } else {
    system = `${systemPrompt}\n\n${contextBlock}`
  }

  return {
    model: route.model,
    system,
    messages,
    max_tokens: maxTokens,
    stream: route.realtime,
  }
}

// ─── Singleton client ─────────────────────────────────────────────────────────

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}
