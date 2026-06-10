/**
 * One-time data refresh: 2026-06-09 architecture session handoff.
 * See docs/2026-06-09-data-refresh-sprint-handoff.md
 *
 * - projects.json → 27 records (7 matched by name keep IDs, 20 new P-014+)
 * - decisions.json → append D-006..D-010, mark D-005 superseded by D-007
 * - opportunities.json → O-001 DORMANT
 *
 * Run with: npx tsx scripts/refresh-2026-06-09.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getDriveFile, updateDriveFile } from '../lib/drive'
import type { Project, Decision, Agent, Domain } from '../lib/schema'

const TODAY = '2026-06-09'

const AGENT_BY_DOMAIN: Record<Domain, Agent> = {
  CAPITAL_MARKETS: 'capital_markets',
  NEWCO: 'newco',
  SUDESTADA: 'sudestada',
  FILM: 'film',
  MEDIA: 'media',
  PHD: 'research_personal',
  PERSONAL: 'research_personal',
}

// id: existing ID to keep (matched by name) or new sequential ID
type Refresh = {
  id: string
  name: string
  domain: Domain
  status: Project['status']
  priority: Project['priority']
  milestone: string
  next_action: string
  next_action_date: string | null
  note?: string
}

const refreshed: Refresh[] = [
  { id: 'P-001', name: 'Costa Food', domain: 'CAPITAL_MARKETS', status: 'ON_HOLD', priority: 'P2', milestone: 'Pending client definition', next_action: 'Await client scope definition', next_action_date: null, note: 'Reactivate when client defines scope' },
  { id: 'P-014', name: 'Continental share dematerialization', domain: 'CAPITAL_MARKETS', status: 'CLOSED', priority: 'P2', milestone: 'Completed. First leading listed company on BVPASA at 100% dematerialized. Avalon advisor and custodian', next_action: 'None. Media follow-up tracked under MEDIA', next_action_date: null },
  { id: 'P-015', name: 'IMF BCP de-dollarization engagement', domain: 'CAPITAL_MARKETS', status: 'ACTIVE', priority: 'P2', milestone: 'June 2026 macroprudential mission meeting held at BCP', next_action: 'Follow up with BCP and Superintendencia on five-pillar framework positioning', next_action_date: '2026-06-20' },
  { id: 'P-016', name: 'AZPA Petroquim Monteverde M&A', domain: 'CAPITAL_MARKETS', status: 'ACTIVE', priority: 'P1', milestone: 'Representing CE and GCM vs ALPAX/Hoeckle, approx USD 75.9M per investor', next_action: 'Confirm current negotiation step in app', next_action_date: '2026-06-16' },
  { id: 'P-017', name: 'CFO As A Service (Coopeduc anchor)', domain: 'CAPITAL_MARKETS', status: 'ON_HOLD', priority: 'P2', milestone: 'Launched with Coopeduc as anchor client', next_action: 'CONFIRM_IN_APP: current status unknown', next_action_date: null },
  { id: 'P-004', name: 'Newco MVP', domain: 'NEWCO', status: 'ACTIVE', priority: 'P1', milestone: 'July 31 hard deadline. Anchored to Lirium Step 1: manual OTC plus white-label dashboard under Lirium license', next_action: 'Weekly MVP checkpoint with Lirium', next_action_date: '2026-06-13' },
  { id: 'P-018', name: 'Aurum Tech S.A. operationalization', domain: 'NEWCO', status: 'ACTIVE', priority: 'P1', milestone: 'Incorporated 2026-05-13. Altieri Director Presidente, Sofia Espinola Harms Director Titular', next_action: 'Confirm operating setup: banking, compliance, signatures', next_action_date: '2026-06-20' },
  { id: 'P-019', name: 'Newco vendor decisions', domain: 'NEWCO', status: 'ACTIVE', priority: 'P1', milestone: 'Open: G-Payments USD 80K vs Mastercard USD 235K scope overlap; Walkers VASP registration vs full license fork', next_action: 'Resolve scope overlap and license fork with Maxi', next_action_date: '2026-06-20' },
  { id: 'P-020', name: 'Newco CEO search', domain: 'NEWCO', status: 'ACTIVE', priority: 'P2', milestone: 'GROW Solutions proposal received 2026-05-25', next_action: 'Respond to GROW proposal', next_action_date: '2026-06-20' },
  { id: 'P-021', name: 'Citi tokenization conversations', domain: 'NEWCO', status: 'ACTIVE', priority: 'P2', milestone: 'Exploratory, en curso', next_action: 'Schedule next touchpoint', next_action_date: null },
  { id: 'P-007', name: 'Advisory lead USD 6-7M', domain: 'SUDESTADA', status: 'DORMANT', priority: 'P3', milestone: 'Qualified, then went quiet', next_action: 'Revisit', next_action_date: '2026-09-01' },
  { id: 'P-022', name: 'Complejo Barrail', domain: 'SUDESTADA', status: 'ACTIVE', priority: 'P1', milestone: 'USD 267M mixed-use Asuncion. Phased capital stack proposed: land as equity, staged construction debt, fideicomiso refinancing', next_action: 'Dinner with Barrail family and investor contact', next_action_date: '2026-06-15' },
  { id: 'P-023', name: 'Gonzales Acosta multifamily program', domain: 'SUDESTADA', status: 'ACTIVE', priority: 'P1', milestone: '10 sequential buildings approx USD 2M each. Conveyor-belt fideicomiso structure designed', next_action: 'Present structure to VGA', next_action_date: '2026-06-30' },
  { id: 'P-024', name: 'Paraguay Flash', domain: 'SUDESTADA', status: 'ON_HOLD', priority: 'P2', milestone: 'Architecture defined: Lane A neutral entity, Gilda director, family roles assigned', next_action: 'CONFIRM_IN_APP: activation status unknown', next_action_date: null },
  { id: 'P-025', name: 'Spanish SL incorporation', domain: 'SUDESTADA', status: 'ACTIVE', priority: 'P2', milestone: 'Tied to July Spain trip. Basque film tax incentives under evaluation', next_action: 'Pre-trip checklist: advisors, structure, banking', next_action_date: '2026-06-30' },
  { id: 'P-008', name: 'Maldecidos', domain: 'FILM', status: 'ACTIVE', priority: 'P1', milestone: 'Principal photography August 2026. Hugo Cardozo directing, Gonzalo line producer. Budget approx USD 200K. Actor contracts drafted. DP hire delegated to Hugo at USD 6.5K anchor', next_action: 'Close DP hire and collect cast signatures', next_action_date: '2026-06-20' },
  { id: 'P-026', name: 'Influencer por Accidente: INAP submission', domain: 'FILM', status: 'ACTIVE', priority: 'P1', milestone: 'INAP Fondos Concursables deadline 2026-06-26. Samuel Cardozo directing', next_action: 'Close gaps: distribution plan, equipment list, DINAPI title-page field', next_action_date: '2026-06-16' },
  { id: 'P-027', name: 'Influencer por Accidente: investor page', domain: 'FILM', status: 'ACTIVE', priority: 'P2', milestone: 'Sponsor version live in repo. Investor variant pending', next_action: 'Define deal terms: raise amount, instrument, recoupment waterfall', next_action_date: '2026-06-20' },
  { id: 'P-028', name: 'KH talent management S.A.', domain: 'FILM', status: 'ACTIVE', priority: 'P1', milestone: 'Term sheet final: 80/20 with growth-triggered ratchet capped at parity', next_action: 'Present to KH. Open items: client portfolio treatment, dividend threshold', next_action_date: '2026-06-20' },
  { id: 'P-029', name: 'Morbido / Cannes Fantastic Pavilion', domain: 'FILM', status: 'ACTIVE', priority: 'P2', milestone: 'Mutual NDA executed with all three clarifications incorporated', next_action: 'Define cooperation scope with Pablo Guisa', next_action_date: '2026-06-30' },
  { id: 'P-030', name: 'Spanish production company branding', domain: 'FILM', status: 'ACTIVE', priority: 'P2', milestone: 'Naming shortlist developed, Pytu as lead candidate', next_action: 'Verify .es domain availability, lock name', next_action_date: '2026-06-20' },
  { id: 'P-031', name: 'Tutorial (short film)', domain: 'FILM', status: 'ACTIVE', priority: 'P3', milestone: 'Production-ready script delivered. Cast: Fabi, Santi, Mahiara', next_action: 'Schedule shoot night', next_action_date: '2026-06-30' },
  { id: 'P-032', name: 'La Sucursal del Cielo', domain: 'FILM', status: 'ON_HOLD', priority: 'P3', milestone: 'Pitch deck v3 delivered', next_action: 'Await counterpart response', next_action_date: null },
  { id: 'P-010', name: 'Academia de Cine candidacy', domain: 'FILM', status: 'ACTIVE', priority: 'P2', milestone: 'Declared candidate', next_action: 'CONFIRM_IN_APP: define next milestone', next_action_date: null },
  { id: 'P-011', name: 'IFI: Continental episode', domain: 'MEDIA', status: 'ACTIVE', priority: 'P1', milestone: 'Interview guide ready. Guests: Teresa Gaona and Rodrigo Ortiz (Banco Continental directors)', next_action: 'Confirm recording date', next_action_date: '2026-06-13' },
  { id: 'P-012', name: 'PhD UNA', domain: 'PHD', status: 'ACTIVE', priority: 'P2', milestone: 'Wiki compiled: 15 concepts. Rudi Torga / Teatro Estudio Libre focus', next_action: 'Define next research move', next_action_date: '2026-06-30' },
  { id: 'P-033', name: 'Spain trip (July)', domain: 'PERSONAL', status: 'ACTIVE', priority: 'P1', milestone: 'Bilbao, San Sebastian, Madrid. Dual purpose: leisure plus business development', next_action: 'Lock meeting calendar: Film Basque Country, Pokeepsie Films, Tornasol', next_action_date: '2026-06-25' },
]

const newDecisions: Decision[] = [
  { decision_id: 'D-006', date: TODAY, domain: 'NEWCO', title: 'July 31 MVP anchored to Lirium Step 1 (manual OTC plus white-label dashboard) as the only timeline-compatible deliverable', rationale: '', implications: [], linked_projects: ['P-004'], status: 'STANDING' },
  { decision_id: 'D-007', date: TODAY, domain: 'SUDESTADA', title: 'USD 6-7M advisory lead classified DORMANT, revisit Q3 2026', rationale: '', implications: [], linked_projects: ['P-007'], status: 'STANDING' },
  { decision_id: 'D-008', date: TODAY, domain: 'FILM', title: 'KH partnership structured as 80/20 with growth-triggered equity ratchet capped at parity', rationale: '', implications: [], linked_projects: ['P-028'], status: 'STANDING' },
  { decision_id: 'D-009', date: TODAY, domain: 'CROSS', title: 'Renegade OS becomes system of record for project updates and edits. Conversational CRUD via agent tool use replaces chat interviews and manual JSON edits', rationale: '', implications: [], linked_projects: [], status: 'STANDING' },
  { decision_id: 'D-010', date: TODAY, domain: 'CROSS', title: 'Briefing filter rule: surface all P1s plus anything with next_action_date within 14 days. Collapse the rest to per-domain counts', rationale: '', implications: [], linked_projects: [], status: 'STANDING' },
]

async function main() {
  // ── projects.json ──
  const current = await getDriveFile('projects.json')
  const byId = new Map(current.map((p) => [p.project_id, p]))

  const projects: Project[] = refreshed.map((r) => {
    const existing = byId.get(r.id)
    return {
      ...(existing ?? {}),
      project_id: r.id,
      name: r.name,
      domain: r.domain,
      agent: AGENT_BY_DOMAIN[r.domain],
      status: r.status,
      priority: r.priority,
      milestone: r.milestone,
      next_action: r.next_action,
      next_action_date: r.next_action_date as Project['next_action_date'],
      last_action: existing?.last_action ?? 'Captured in 2026-06-09 data refresh',
      notes: r.note ?? existing?.notes ?? '',
      updated_at: TODAY,
    }
  })

  const dropped = current.filter((p) => !projects.some((n) => n.project_id === p.project_id))
  await updateDriveFile('projects.json', projects)
  console.log(`projects.json written: ${projects.length} records`)
  console.log(`dropped: ${dropped.map((p) => `${p.project_id} ${p.name}`).join(', ') || 'none'}`)

  // ── decisions.json ──
  const decisions = await getDriveFile('decisions.json')
  for (const d of decisions) {
    if (d.decision_id === 'D-005' && d.status === 'STANDING') {
      // Directly reversed by D-007 (lead now DORMANT)
      d.status = 'SUPERSEDED'
      d.superseded_by = 'D-007'
    }
  }
  const existingIds = new Set(decisions.map((d) => d.decision_id))
  const toAppend = newDecisions.filter((d) => !existingIds.has(d.decision_id))
  await updateDriveFile('decisions.json', [...decisions, ...toAppend])
  console.log(`decisions.json written: ${decisions.length + toAppend.length} records (+${toAppend.length})`)

  // ── opportunities.json ──
  const opps = await getDriveFile('opportunities.json')
  for (const o of opps) {
    if (o.opportunity_id === 'O-001') {
      o.status = 'DORMANT'
      o.notes = 'Revisit Q3 2026.'
      o.next_action = 'Revisit'
      o.next_action_date = '2026-09-01'
      o.updated_at = TODAY
    }
  }
  await updateDriveFile('opportunities.json', opps)
  console.log(`opportunities.json written: ${opps.length} records`)
}

main()
