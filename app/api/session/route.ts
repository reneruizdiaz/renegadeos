import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDriveFile, updateDriveFile } from '@/lib/drive'
import { MODELS } from '@/lib/cost-router'
import type { Session } from '@/lib/schema'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function generateId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── POST /api/session — summarize and save ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { agentId, conversationHistory } = await request.json() as {
      agentId: string
      conversationHistory: Array<{ role: string; content: string }>
    }

    if (!conversationHistory || conversationHistory.length < 2) {
      return Response.json({ error: 'Not enough messages to save.' }, { status: 400 })
    }

    const transcript = conversationHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n')

    const summaryResponse = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1024,
      system:
        'You are summarizing a Renegade OS session for the knowledge base. Respond with valid JSON only. No preamble, no markdown fencing.',
      messages: [
        {
          role: 'user',
          content: `Read this conversation and produce a structured session note with exactly these fields:
- summary: string — 3-5 sentences, what was discussed and what was decided
- outputs: array of strings — documents or decisions produced (empty array if none)
- linked_projects: array of strings — project_ids mentioned (e.g. "P-001", "P-007")
- follow_ups: array of strings — things to address next session (maximum 3)

Conversation:
${transcript}

Respond with valid JSON only.`,
        },
      ],
    })

    const raw =
      summaryResponse.content[0].type === 'text'
        ? summaryResponse.content[0].text.trim()
        : ''

    let parsed: {
      summary: string
      outputs: string[]
      linked_projects: string[]
      follow_ups: string[]
    }

    try {
      // Strip markdown fences if model included them despite instructions
      const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(clean)
    } catch {
      console.error('[/api/session] JSON parse failed:', raw)
      return Response.json({ error: 'Failed to parse session summary.' }, { status: 500 })
    }

    const sessionId = generateId()
    const newSession: Session = {
      session_id: sessionId,
      date: new Date().toISOString(),
      agent: agentId as Session['agent'],
      summary: parsed.summary ?? '',
      outputs: parsed.outputs ?? [],
      linked_projects: parsed.linked_projects ?? [],
      follow_ups: parsed.follow_ups ?? [],
    }

    const sessions = await getDriveFile('sessions.json')
    sessions.push(newSession)
    await updateDriveFile('sessions.json', sessions)

    return Response.json({ success: true, session_id: sessionId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/session POST]', message)
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── GET /api/session — return last N sessions ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '5', 10)

    const sessions = await getDriveFile('sessions.json')
    const recent = sessions.slice(-limit).reverse()

    return Response.json(recent)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/session GET]', message)
    return Response.json([], { status: 200 }) // degrade gracefully
  }
}
