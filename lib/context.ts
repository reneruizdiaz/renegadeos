import { getDriveFile } from './drive'
import type { AgentId } from './agents'
import type { Domain, Project, Decision, Opportunity } from './schema'

const DOMAIN_MAP: Record<AgentId, Domain[]> = {
  'chief-of-staff':    [],  // reads ALL domains
  'capital-markets':   ['CAPITAL_MARKETS'],
  'newco':             ['NEWCO'],
  'sudestada':         ['SUDESTADA'],
  'film':              ['FILM'],
  'media':             ['MEDIA'],
  'research-personal': ['PHD', 'PERSONAL'],
}

function formatProjects(projects: Project[]): string {
  if (projects.length === 0) return 'No active projects.'
  return projects
    .map((p) => {
      let line = `[${p.project_id}] ${p.name} | ${p.status} ${p.priority}`
      if (p.milestone) line += ` | ${p.milestone}`
      if (p.counterparty) line += ` | Counterparty: ${p.counterparty}`
      line += ` | Last: ${p.last_action}`
      if (p.last_action_date) line += ` (${p.last_action_date})`
      line += ` | Next: ${p.next_action} (${p.next_action_date})`
      if (p.notes) line += ` | Notes: ${p.notes}`
      return line
    })
    .join('\n')
}

/**
 * Briefing filter rule (D-010): surface all P1 projects plus anything with a
 * next_action_date within 14 days (including overdue). Collapse the rest to a
 * one-line count per domain so 27 projects don't drown the briefing.
 */
export function formatChiefProjects(projects: Project[]): string {
  const open = projects.filter((p) => p.status !== 'CLOSED')

  const cutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const surfaced = open.filter(
    (p) =>
      p.priority === 'P1' ||
      (p.next_action_date != null && p.next_action_date <= cutoff)
  )
  surfaced.sort((a, b) => {
    const pri = { P1: 0, P2: 1, P3: 2 }
    return pri[a.priority] - pri[b.priority]
  })

  const collapsed = open.filter((p) => !surfaced.includes(p))
  const byDomain = new Map<string, Project[]>()
  for (const p of collapsed) {
    byDomain.set(p.domain, [...(byDomain.get(p.domain) ?? []), p])
  }

  let out = formatProjects(surfaced)
  if (collapsed.length > 0) {
    out += '\n\n### Not shown (no P1 flag, no action due within 14 days)\n'
    out += [...byDomain.entries()]
      .map(([domain, projs]) => {
        const statuses = projs.map((p) => `${p.name} (${p.status})`).join(', ')
        return `${domain}: ${projs.length} — ${statuses}`
      })
      .join('\n')
  }
  return out
}

function formatDecisions(decisions: Decision[]): string {
  if (decisions.length === 0) return 'No standing decisions.'
  return decisions
    .filter((d) => d.status === 'STANDING')
    .map(
      (d) =>
        `[${d.decision_id}] ${d.title} (${d.date}) — ${d.rationale}`
    )
    .join('\n')
}

function formatOpportunities(opps: Opportunity[]): string {
  if (opps.length === 0) return 'No active opportunities.'
  return opps
    .filter((o) => o.status === 'LIVE' || o.status === 'QUALIFIED')
    .map(
      (o) =>
        `[${o.opportunity_id}] ${o.name} | ${o.type} | ${o.size_estimate} | ${o.probability} probability | Next: ${o.next_action} (${o.next_action_date})${o.notes ? ` | ${o.notes}` : ''}`
    )
    .join('\n')
}

export async function assembleContext(agentId: AgentId): Promise<string> {
  const domains = DOMAIN_MAP[agentId]
  const isChiefOfStaff = agentId === 'chief-of-staff'

  const [projects, decisions, opportunities] = await Promise.all([
    getDriveFile('projects.json'),
    getDriveFile('decisions.json'),
    getDriveFile('opportunities.json'),
  ])

  const filteredProjects = projects.filter(
    (p) => isChiefOfStaff || (domains.includes(p.domain) && p.status !== 'CLOSED')
  )

  filteredProjects.sort((a, b) => {
    const pri = { P1: 0, P2: 1, P3: 2 }
    return pri[a.priority] - pri[b.priority]
  })

  const projectsBlock = isChiefOfStaff
    ? formatChiefProjects(filteredProjects)
    : formatProjects(filteredProjects)

  const filteredDecisions = isChiefOfStaff
    ? decisions
    : decisions.filter(
        (d) => domains.includes(d.domain as Domain) || d.domain === 'CROSS'
      )

  const filteredOpps = isChiefOfStaff
    ? opportunities
    : opportunities.filter((o) => domains.includes(o.domain))

  const today = new Date().toISOString().split('T')[0]

  return `---
LIVE CONTEXT — ${today}
---

## ACTIVE PROJECTS
${projectsBlock}

## STANDING DECISIONS
${formatDecisions(filteredDecisions)}

## ACTIVE OPPORTUNITIES
${formatOpportunities(filteredOpps)}
---`
}
