import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAgent, type AgentId } from '@/lib/agents'
import { assembleContext } from '@/lib/context'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { agentId, message, conversationHistory = [] } = await request.json() as {
      agentId: AgentId
      message: string
      conversationHistory: Anthropic.MessageParam[]
    }

    const agent = getAgent(agentId)
    const contextBlock = await assembleContext(agentId)

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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
