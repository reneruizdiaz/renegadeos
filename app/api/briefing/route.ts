import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDriveFile } from '@/lib/drive'
import { getAgent } from '@/lib/agents'
import type { Project, Decision, Commitment, Opportunity, Session } from '@/lib/schema'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function assembleBriefingContext(
  projects: Project[],
  decisions: Decision[],
  commitments: Commitment[],
  opportunities: Opportunity[],
  sessions: Session[]
): string {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const activeProjects = projects
    .filter((p) => p.status === 'ACTIVE' || p.status === 'WATCH')
    .sort((a, b) => {
      const pri: Record<string, number> = { P1: 0, P2: 1, P3: 2 }
      return (pri[a.priority] ?? 3) - (pri[b.priority] ?? 3)
    })

  const openCommitments = commitments.filter((c) => c.status === 'OPEN')
  const liveOpps = opportunities.filter(
    (o) => o.status === 'LIVE' || o.status === 'QUALIFIED'
  )
  const recentDecisions = decisions.filter(
    (d) => new Date(d.date) >= thirtyDaysAgo
  )
  const recentSessions = sessions.slice(-3)

  // Group projects by domain
  const byDomain: Record<string, Project[]> = {}
  for (const p of activeProjects) {
    if (!byDomain[p.domain]) byDomain[p.domain] = []
    byDomain[p.domain].push(p)
  }

  const todayStr = today.toISOString().split('T')[0]
  let ctx = `--- MORNING BRIEFING CONTEXT — ${todayStr} ---\n\n`

  ctx += '## ACTIVE PROJECTS BY DOMAIN\n'
  for (const [domain, projs] of Object.entries(byDomain)) {
    ctx += `\n### ${domain}\n`
    for (const p of projs) {
      ctx += `[${p.project_id}] ${p.name} | ${p.status} ${p.priority}`
      if (p.milestone) ctx += ` | ${p.milestone}`
      if (p.counterparty) ctx += ` | Counterparty: ${p.counterparty}`
      ctx += `\n  Last: ${p.last_action}`
      ctx += `\n  Next: ${p.next_action} — by ${p.next_action_date}`
      if (p.notes) ctx += `\n  Notes: ${p.notes}`
      ctx += '\n'
    }
  }

  if (openCommitments.length > 0) {
    ctx += '\n## OPEN COMMITMENTS\n'
    for (const c of openCommitments) {
      ctx += `[${c.commitment_id}] ${c.description} — promised to ${c.promised_to} — due ${c.due_date}\n`
    }
  }

  if (liveOpps.length > 0) {
    ctx += '\n## LIVE OPPORTUNITIES\n'
    for (const o of liveOpps) {
      ctx += `[${o.opportunity_id}] ${o.name} | ${o.type} | ${o.size_estimate} | ${o.probability} probability | Next: ${o.next_action} (${o.next_action_date})`
      if (o.notes) ctx += ` | ${o.notes}`
      ctx += '\n'
    }
  }

  if (recentDecisions.length > 0) {
    ctx += '\n## RECENT DECISIONS (last 30 days)\n'
    for (const d of recentDecisions) {
      ctx += `[${d.decision_id}] ${d.date} — ${d.title}: ${d.rationale}\n`
      if (d.implications.length > 0) {
        ctx += `  Implications: ${d.implications.join('; ')}\n`
      }
    }
  }

  if (recentSessions.length > 0) {
    ctx += '\n## RECENT SESSIONS\n'
    for (const s of recentSessions) {
      ctx += `${s.date} [${s.agent}] — ${s.summary}\n`
    }
  }

  ctx += '\n---'
  return ctx
}

export async function POST(_request: NextRequest) {
  try {
    const [projects, decisions, commitments, opportunities, sessions] =
      await Promise.all([
        getDriveFile('projects.json'),
        getDriveFile('decisions.json'),
        getDriveFile('commitments.json'),
        getDriveFile('opportunities.json'),
        getDriveFile('sessions.json'),
      ])

    const contextBlock = assembleBriefingContext(
      projects,
      decisions,
      commitments,
      opportunities,
      sessions
    )

    const agent = getAgent('chief-of-staff')
    const systemPrompt =
      agent.systemPrompt +
      '\n\nIMPORTANT: Your Cross-Domain Note must name at least two specific projects by name, explain the connection in one sentence, and state one concrete implication for this week.'

    const todayFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `${systemPrompt}\n\n${contextBlock}`,
      messages: [
        {
          role: 'user',
          content: `Generate my morning briefing. Today is ${todayFormatted}.`,
        },
      ],
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
    console.error('[/api/briefing]', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
