import type Anthropic from '@anthropic-ai/sdk'
import { getDriveFile, updateDriveFile } from './drive'
import type {
  Agent,
  ChangelogEntry,
  Decision,
  Domain,
  Opportunity,
  Project,
  Session,
} from './schema'

// ─── Enums and helpers ────────────────────────────────────────────────────────

const DOMAINS: Domain[] = [
  'CAPITAL_MARKETS',
  'NEWCO',
  'SUDESTADA',
  'FILM',
  'MEDIA',
  'PHD',
  'PERSONAL',
]

const PROJECT_STATUSES = [
  'ACTIVE',
  'WATCH',
  'STALLED',
  'ON_HOLD',
  'DORMANT',
  'CLOSED',
  'SOMEDAY',
] as const

const PRIORITIES = ['P1', 'P2', 'P3'] as const

const OPPORTUNITY_STATUSES = [
  'LIVE',
  'QUALIFIED',
  'DORMANT',
  'PASSED',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const

const AGENT_BY_DOMAIN: Record<Domain, Agent> = {
  CAPITAL_MARKETS: 'capital_markets',
  NEWCO: 'newco',
  SUDESTADA: 'sudestada',
  FILM: 'film',
  MEDIA: 'media',
  PHD: 'research_personal',
  PERSONAL: 'research_personal',
}

// Fields that must never be emptied on an existing record
const PROJECT_REQUIRED = ['name', 'domain', 'status', 'priority', 'next_action']
const OPPORTUNITY_REQUIRED = ['name', 'domain', 'status', 'next_action']

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function nextId(prefix: string, existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = parseInt(id.replace(`${prefix}-`, ''), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

class ToolError extends Error {}

// ─── Tool definitions (Anthropic tool-use schema) ─────────────────────────────

export const WRITE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_project',
    description:
      'Update fields on an existing project in the system of record (Google Drive). Use this when René reports a status change, a completed step, a new next action, or any project edit. Never delete a project — set status CLOSED instead. After the tool succeeds, confirm the change back to René in one short sentence.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'e.g. "P-001". Must exist.' },
        updates: {
          type: 'object',
          description: 'Only the fields to change.',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string', enum: DOMAINS },
            status: { type: 'string', enum: [...PROJECT_STATUSES] },
            priority: { type: 'string', enum: [...PRIORITIES] },
            milestone: { type: 'string' },
            counterparty: { type: 'string' },
            last_action: { type: 'string' },
            last_action_date: { type: 'string', description: 'YYYY-MM-DD' },
            next_action: { type: 'string' },
            next_action_date: {
              type: ['string', 'null'],
              description: 'YYYY-MM-DD or null if no date yet',
            },
            notes: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['project_id', 'updates'],
    },
  },
  {
    name: 'create_project',
    description:
      'Create a new project in the system of record. Use when René describes a genuinely new workstream that is not already tracked. Check the project list in your context first — prefer update_project if it already exists.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        domain: { type: 'string', enum: DOMAINS },
        status: { type: 'string', enum: [...PROJECT_STATUSES], description: 'Default ACTIVE' },
        priority: { type: 'string', enum: [...PRIORITIES] },
        milestone: { type: 'string' },
        counterparty: { type: 'string' },
        next_action: { type: 'string' },
        next_action_date: { type: ['string', 'null'], description: 'YYYY-MM-DD or null' },
        notes: { type: 'string' },
      },
      required: ['name', 'domain', 'priority', 'next_action'],
    },
  },
  {
    name: 'update_opportunity',
    description:
      'Update fields on an existing opportunity in the system of record. Never delete — use status PASSED, CLOSED_WON, CLOSED_LOST or DORMANT instead.',
    input_schema: {
      type: 'object',
      properties: {
        opportunity_id: { type: 'string', description: 'e.g. "O-001". Must exist.' },
        updates: {
          type: 'object',
          description: 'Only the fields to change.',
          properties: {
            name: { type: 'string' },
            domain: { type: 'string', enum: DOMAINS },
            status: { type: 'string', enum: [...OPPORTUNITY_STATUSES] },
            probability: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] },
            size_estimate: { type: 'string' },
            source: { type: 'string' },
            next_action: { type: 'string' },
            next_action_date: { type: ['string', 'null'] },
            linked_contact: { type: 'string' },
            notes: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['opportunity_id', 'updates'],
    },
  },
  {
    name: 'log_decision',
    description:
      'Append a decision record to the decision log. Use when René states a firm decision (not an option under consideration). Decisions are append-only.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: [...DOMAINS, 'CROSS'],
          description: 'CROSS for decisions spanning multiple domains',
        },
        title: { type: 'string', description: 'The decision itself, one sentence' },
        rationale: { type: 'string' },
        implications: { type: 'array', items: { type: 'string' } },
        linked_projects: { type: 'array', items: { type: 'string' } },
      },
      required: ['domain', 'title'],
    },
  },
  {
    name: 'log_session_note',
    description:
      'Save a session note summarizing this conversation to the knowledge base. Use when René asks to save the session or when a conversation produced outcomes worth recording.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '3-line summary of the conversation' },
        outputs: { type: 'array', items: { type: 'string' } },
        linked_projects: { type: 'array', items: { type: 'string' } },
        follow_ups: { type: 'array', items: { type: 'string' }, description: 'Max 3' },
      },
      required: ['summary'],
    },
  },
]

// ─── Validation ───────────────────────────────────────────────────────────────

function rejectDroppedRequiredFields(
  updates: Record<string, unknown>,
  required: string[]
) {
  for (const field of required) {
    if (field in updates) {
      const v = updates[field]
      if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
        throw new ToolError(
          `Rejected: "${field}" is required and cannot be emptied.`
        )
      }
    }
  }
}

function diffOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): ChangelogEntry['diff'] {
  const diff: ChangelogEntry['diff'] = {}
  for (const f of fields) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) {
      diff[f] = { from: before[f] ?? null, to: after[f] ?? null }
    }
  }
  return diff
}

// ─── Executors ────────────────────────────────────────────────────────────────

type ExecResult = { ok: boolean; message: string; changelog?: ChangelogEntry }

async function execUpdateProject(
  input: { project_id: string; updates: Record<string, unknown> },
  agent: Agent
): Promise<ExecResult> {
  const { project_id, updates } = input
  if (!project_id || !updates || Object.keys(updates).length === 0) {
    throw new ToolError('Rejected: project_id and at least one update field required.')
  }
  rejectDroppedRequiredFields(updates, PROJECT_REQUIRED)

  const projects = await getDriveFile('projects.json')
  const project = projects.find((p) => p.project_id === project_id)
  if (!project) {
    throw new ToolError(
      `Rejected: project ${project_id} not found. Existing IDs: ${projects.map((p) => p.project_id).join(', ')}`
    )
  }

  const before = { ...project }
  const fields = Object.keys(updates)
  for (const f of fields) {
    ;(project as unknown as Record<string, unknown>)[f] = updates[f]
  }
  if (updates.domain) {
    project.agent = AGENT_BY_DOMAIN[updates.domain as Domain]
  }
  project.updated_at = today()

  const diff = diffOf(before, project as unknown as Record<string, unknown>, fields)
  if (Object.keys(diff).length === 0) {
    return { ok: true, message: `No change — ${project_id} already had those values.` }
  }

  await updateDriveFile('projects.json', projects)
  return {
    ok: true,
    message: `Updated ${project_id} (${project.name}): ${Object.keys(diff).join(', ')}.`,
    changelog: { timestamp: new Date().toISOString(), agent, tool: 'update_project', target_id: project_id, diff },
  }
}

async function execCreateProject(
  input: Partial<Project> & { name: string; domain: Domain; priority: Project['priority']; next_action: string },
  agent: Agent
): Promise<ExecResult> {
  rejectDroppedRequiredFields(input as Record<string, unknown>, PROJECT_REQUIRED.filter((f) => f !== 'status'))
  if (!DOMAINS.includes(input.domain)) {
    throw new ToolError(`Rejected: invalid domain "${input.domain}".`)
  }

  const projects = await getDriveFile('projects.json')
  const dup = projects.find((p) => p.name.toLowerCase() === input.name.toLowerCase())
  if (dup) {
    throw new ToolError(
      `Rejected: a project named "${dup.name}" already exists (${dup.project_id}). Use update_project.`
    )
  }

  const project: Project = {
    project_id: nextId('P', projects.map((p) => p.project_id)),
    name: input.name,
    domain: input.domain,
    agent: AGENT_BY_DOMAIN[input.domain],
    status: input.status ?? 'ACTIVE',
    priority: input.priority,
    milestone: input.milestone ?? '',
    counterparty: input.counterparty,
    last_action: `Created via ${agent} agent`,
    last_action_date: today(),
    next_action: input.next_action,
    next_action_date: (input.next_action_date ?? null) as Project['next_action_date'],
    notes: input.notes ?? '',
    created_at: today(),
    updated_at: today(),
  }

  projects.push(project)
  await updateDriveFile('projects.json', projects)

  const diff: ChangelogEntry['diff'] = {}
  for (const [k, v] of Object.entries(project)) {
    if (v !== undefined && v !== '' && v !== null) diff[k] = { from: null, to: v }
  }
  return {
    ok: true,
    message: `Created ${project.project_id}: ${project.name} (${project.domain}, ${project.status} ${project.priority}).`,
    changelog: { timestamp: new Date().toISOString(), agent, tool: 'create_project', target_id: project.project_id, diff },
  }
}

async function execUpdateOpportunity(
  input: { opportunity_id: string; updates: Record<string, unknown> },
  agent: Agent
): Promise<ExecResult> {
  const { opportunity_id, updates } = input
  if (!opportunity_id || !updates || Object.keys(updates).length === 0) {
    throw new ToolError('Rejected: opportunity_id and at least one update field required.')
  }
  rejectDroppedRequiredFields(updates, OPPORTUNITY_REQUIRED)

  const opps = await getDriveFile('opportunities.json')
  const opp = opps.find((o) => o.opportunity_id === opportunity_id)
  if (!opp) {
    throw new ToolError(
      `Rejected: opportunity ${opportunity_id} not found. Existing IDs: ${opps.map((o) => o.opportunity_id).join(', ')}`
    )
  }

  const before = { ...opp }
  const fields = Object.keys(updates)
  for (const f of fields) {
    ;(opp as unknown as Record<string, unknown>)[f] = updates[f]
  }
  opp.updated_at = today()

  const diff = diffOf(before, opp as unknown as Record<string, unknown>, fields)
  if (Object.keys(diff).length === 0) {
    return { ok: true, message: `No change — ${opportunity_id} already had those values.` }
  }

  await updateDriveFile('opportunities.json', opps)
  return {
    ok: true,
    message: `Updated ${opportunity_id} (${opp.name}): ${Object.keys(diff).join(', ')}.`,
    changelog: { timestamp: new Date().toISOString(), agent, tool: 'update_opportunity', target_id: opportunity_id, diff },
  }
}

async function execLogDecision(
  input: { domain: Domain | 'CROSS'; title: string; rationale?: string; implications?: string[]; linked_projects?: string[] },
  agent: Agent
): Promise<ExecResult> {
  if (!input.title?.trim()) throw new ToolError('Rejected: title is required.')

  const decisions = await getDriveFile('decisions.json')
  const decision: Decision = {
    decision_id: nextId('D', decisions.map((d) => d.decision_id)),
    date: today(),
    domain: input.domain,
    title: input.title,
    rationale: input.rationale ?? '',
    implications: input.implications ?? [],
    linked_projects: input.linked_projects ?? [],
    status: 'STANDING',
  }
  decisions.push(decision)
  await updateDriveFile('decisions.json', decisions)

  return {
    ok: true,
    message: `Logged ${decision.decision_id}: ${decision.title}`,
    changelog: {
      timestamp: new Date().toISOString(),
      agent,
      tool: 'log_decision',
      target_id: decision.decision_id,
      diff: { title: { from: null, to: decision.title } },
    },
  }
}

export async function upsertSessionNote(
  note: {
    session_id?: string
    summary: string
    outputs?: string[]
    linked_projects?: string[]
    follow_ups?: string[]
  },
  agent: Agent
): Promise<ExecResult> {
  if (!note.summary?.trim()) throw new ToolError('Rejected: summary is required.')

  const sessions = await getDriveFile('sessions.json')
  const id = note.session_id ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const session: Session = {
    session_id: id,
    date: new Date().toISOString(),
    agent,
    summary: note.summary,
    outputs: note.outputs ?? [],
    linked_projects: note.linked_projects ?? [],
    follow_ups: (note.follow_ups ?? []).slice(0, 3),
  }

  const idx = sessions.findIndex((s) => s.session_id === id)
  if (idx >= 0) sessions[idx] = session
  else sessions.push(session)
  await updateDriveFile('sessions.json', sessions)

  return {
    ok: true,
    message: `Session note saved (${id}).`,
    changelog: {
      timestamp: new Date().toISOString(),
      agent,
      tool: 'log_session_note',
      target_id: id,
      diff: { summary: { from: null, to: session.summary } },
    },
  }
}

// ─── Batch executor ───────────────────────────────────────────────────────────

export interface ToolCall {
  id: string
  name: string
  input: unknown
}

export interface ToolResultMsg {
  tool_use_id: string
  content: string
  is_error?: boolean
}

/**
 * Executes one batch of tool calls sequentially and appends all resulting
 * changelog entries in a single changelog.json write.
 */
export async function executeWriteBatch(
  calls: ToolCall[],
  agent: Agent
): Promise<ToolResultMsg[]> {
  const results: ToolResultMsg[] = []
  const entries: ChangelogEntry[] = []

  for (const call of calls) {
    try {
      let res: ExecResult
      switch (call.name) {
        case 'update_project':
          res = await execUpdateProject(call.input as Parameters<typeof execUpdateProject>[0], agent)
          break
        case 'create_project':
          res = await execCreateProject(call.input as Parameters<typeof execCreateProject>[0], agent)
          break
        case 'update_opportunity':
          res = await execUpdateOpportunity(call.input as Parameters<typeof execUpdateOpportunity>[0], agent)
          break
        case 'log_decision':
          res = await execLogDecision(call.input as Parameters<typeof execLogDecision>[0], agent)
          break
        case 'log_session_note':
          res = await upsertSessionNote(call.input as Parameters<typeof upsertSessionNote>[0], agent)
          break
        default:
          throw new ToolError(`Unknown tool: ${call.name}`)
      }
      if (res.changelog) entries.push(res.changelog)
      results.push({ tool_use_id: call.id, content: res.message })
    } catch (err) {
      const message =
        err instanceof ToolError
          ? err.message
          : `Write failed: ${err instanceof Error ? err.message : String(err)}`
      results.push({ tool_use_id: call.id, content: message, is_error: true })
    }
  }

  if (entries.length > 0) {
    try {
      const changelog = await getDriveFile('changelog.json')
      changelog.push(...entries)
      await updateDriveFile('changelog.json', changelog)
    } catch (err) {
      console.error('[changelog] append failed:', err)
    }
  }

  return results
}

export const TOOL_GUIDANCE = `
## WRITE ACCESS

Renegade OS is the system of record. You have write tools to update projects and opportunities, create projects, log decisions, and save session notes — use them whenever René reports a change, instead of asking him to edit JSON.

Rules:
- Always confirm an executed change back to René in one short sentence (e.g. "Costa Food marked ON_HOLD").
- Never delete anything. Closing a project means status CLOSED.
- One batch of writes per message. If more changes come up, ask René to confirm them in his next message.
- If a write is rejected, tell René exactly why.`
