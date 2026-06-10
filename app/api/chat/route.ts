import { NextRequest } from 'next/server'
import { after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAgent, type AgentId } from '@/lib/agents'
import { assembleContext } from '@/lib/context'
import { MODELS } from '@/lib/cost-router'
import {
  WRITE_TOOLS,
  TOOL_GUIDANCE,
  executeWriteBatch,
  upsertSessionNote,
  type ToolCall,
  type ToolResultMsg,
} from '@/lib/tools'

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

// ─── Auto session capture ─────────────────────────────────────────────────────
// sessions.json stayed empty because manual save never happened. Once a
// conversation passes 4 user messages, every exchange upserts a session note
// keyed by conversationId — the last upsert is the de-facto end-of-conversation
// note, with no dependency on anyone remembering to save.

const AUTO_CAPTURE_AFTER_USER_MESSAGES = 4

async function autoCaptureSession(
  conversationId: string,
  agentId: AgentId,
  transcript: string
) {
  try {
    const res = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 512,
      system:
        'You summarize Renegade OS agent sessions. Respond with valid JSON only — no preamble, no markdown fencing.',
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation as JSON with fields:
- summary: string, exactly 3 lines separated by \\n (what was discussed / what changed or was decided / what is open)
- outputs: array of strings (documents or record changes produced, empty if none)
- linked_projects: array of project_ids mentioned (e.g. "P-004")
- follow_ups: array of strings, max 3

Conversation:
${transcript}`,
        },
      ],
    })

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(clean) as {
      summary: string
      outputs?: string[]
      linked_projects?: string[]
      follow_ups?: string[]
    }

    await upsertSessionNote(
      {
        session_id: `auto-${conversationId}`,
        summary: parsed.summary,
        outputs: parsed.outputs,
        linked_projects: parsed.linked_projects,
        follow_ups: parsed.follow_ups,
      },
      getAgent(agentId).schemaAgent
    )
  } catch (err) {
    console.error('[auto-capture]', err instanceof Error ? err.message : err)
  }
}

// ─── POST /api/chat ────────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 4

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(getIp(request))) {
      return new Response(
        JSON.stringify({ error: 'Slow down — maximum 20 messages per minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { agentId, message, conversationHistory = [], conversationId } =
      await request.json() as {
        agentId: AgentId
        message: string
        conversationHistory: Anthropic.MessageParam[]
        conversationId?: string
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
        text: agent.systemPrompt + '\n' + TOOL_GUIDANCE,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: contextBlock,
        cache_control: { type: 'ephemeral' },
      },
    ]

    let messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    const encoder = new TextEncoder()
    let assistantText = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Guardrail: one write batch per message. The first tool_use round
          // executes; any further round gets an error result and the model
          // must wrap up in text.
          let wroteBatch = false

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const stream = client.messages.stream({
              model: MODELS.SONNET,
              max_tokens: 4096,
              system: systemContent,
              messages,
              tools: WRITE_TOOLS,
            })

            stream.on('text', (text) => {
              assistantText += text
              controller.enqueue(encoder.encode(text))
            })

            const final = await stream.finalMessage()

            if (final.stop_reason !== 'tool_use') break

            const toolUses = final.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )

            let results: ToolResultMsg[]
            if (wroteBatch) {
              results = toolUses.map((tu) => ({
                tool_use_id: tu.id,
                content:
                  'Write limit reached: one batch of writes per message. Tell René what remains and ask him to confirm in his next message.',
                is_error: true,
              }))
            } else {
              const calls: ToolCall[] = toolUses.map((tu) => ({
                id: tu.id,
                name: tu.name,
                input: tu.input,
              }))
              results = await executeWriteBatch(calls, agent.schemaAgent)
              wroteBatch = true
            }

            messages = [
              ...messages,
              { role: 'assistant', content: final.content },
              {
                role: 'user',
                content: results.map((r) => ({
                  type: 'tool_result' as const,
                  tool_use_id: r.tool_use_id,
                  content: r.content,
                  is_error: r.is_error,
                })),
              },
            ]
          }
        } catch (err) {
          controller.error(err)
          return
        }
        controller.close()
      },
    })

    // Auto session capture once the conversation is long enough
    const userMessageCount =
      conversationHistory.filter((m) => m.role === 'user').length + 1
    if (conversationId && userMessageCount > AUTO_CAPTURE_AFTER_USER_MESSAGES) {
      const historyText = conversationHistory
        .map((m) =>
          `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`
        )
        .join('\n\n')
      after(async () => {
        const transcript = `${historyText}\n\nUSER: ${message}\n\nASSISTANT: ${assistantText}`
        await autoCaptureSession(conversationId, agentId, transcript)
      })
    }

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
