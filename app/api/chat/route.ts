import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAgent, type AgentId } from '@/lib/agents'
import { assembleContext } from '@/lib/context'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Simple in-memory rate limiter (20 req / 60s per IP) ─────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 20) return false

  entry.count++
  return true
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(getIp(request))) {
      return new Response(
        JSON.stringify({ error: 'Slow down — maximum 20 messages per minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { agentId, message, conversationHistory = [] } = await request.json() as {
      agentId: AgentId
      message: string
      conversationHistory: Anthropic.MessageParam[]
    }

    const agent = getAgent(agentId)
    let contextBlock: string
    try {
      contextBlock = await assembleContext(agentId)
    } catch {
      contextBlock = '--- Context unavailable — agent running without live data ---'
    }

    const systemContent: Anthropic.TextBlockParam[] = [
      {
        type: 'text',
        text: agent.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: contextBlock,
        cache_control: { type: 'ephemeral' },
      },
    ]

    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemContent,
      messages,
      stream: true,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/chat]', message)
    return new Response(
      JSON.stringify({ error: 'Agent unavailable — try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
