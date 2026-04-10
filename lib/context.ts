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
    .map(
      (p) =>
        `[${p.project_id}] ${p.name} | ${p.status} ${p.priority} | Last: ${p.last_action} (${p.last_action_date}) | Next: ${p.next_action} (${p.next_action_date})${p.notes ? ` | Notes: ${p.notes}` : ''}`
    )
    .join('\n')
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

  const filteredProjects = isChiefOfStaff
    ? projects.filter((p) => p.status !== 'CLOSED')
    : projects.filter(
        (p) => domains.includes(p.domain) && p.status !== 'CLOSED'
      )

  filteredProjects.sort((a, b) => {
    const pri = { P1: 0, P2: 1, P3: 2 }
    return pri[a.priority] - pri[b.priority]
  })

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
${formatProjects(filteredProjects)}

## STANDING DECISIONS
${formatDecisions(filteredDecisions)}

## ACTIVE OPPORTUNITIES
${formatOpportunities(filteredOpps)}
---`
}
