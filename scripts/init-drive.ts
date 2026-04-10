/**
 * One-time script: initializes all 6 JSON files in Google Drive.
 * Run with: npx tsx scripts/init-drive.ts
 *
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DRIVE_FOLDER_ID in env.
 */

import 'dotenv/config'
import { updateDriveFile } from '../lib/drive'
import type {
  Project,
  Decision,
  Contact,
  Commitment,
  Opportunity,
  Session,
} from '../lib/schema'

const now = new Date().toISOString()
const today = now.split('T')[0]

// ─── projects.json ────────────────────────────────────────────────────────────

const projects: Project[] = [
  {
    project_id: 'PRJ-001',
    name: 'Avalon Casa de Bolsa — Operations',
    domain: 'CAPITAL_MARKETS',
    agent: 'capital_markets',
    status: 'ACTIVE',
    priority: 'P1',
    last_action: 'Ongoing daily operations and regulatory compliance',
    last_action_date: today,
    next_action: 'Review deal flow pipeline',
    next_action_date: today,
    dependencies: [],
    notes: 'President. $700M+ AUM. AA+ rated fund.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-002',
    name: 'BVPASA — Board & Strategy',
    domain: 'CAPITAL_MARKETS',
    agent: 'capital_markets',
    status: 'ACTIVE',
    priority: 'P2',
    last_action: 'Active board participation',
    last_action_date: today,
    next_action: 'Prepare next board agenda items',
    next_action_date: today,
    dependencies: [],
    notes: 'Vice President, Bolsa de Valores del Paraguay.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-003',
    name: 'Project Newco — MVP Build',
    domain: 'NEWCO',
    agent: 'newco',
    status: 'ACTIVE',
    priority: 'P1',
    last_action: 'Architecture and board alignment underway',
    last_action_date: today,
    next_action: 'Define MVP feature scope with Lirium AG',
    next_action_date: today,
    dependencies: ['PRJ-001'],
    notes: 'Crypto, tokenization, real-world assets. Banco Continental Group + Lirium AG. July 2026 MVP target. Lead Board Member + PM.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-004',
    name: 'Sudestada Holdings — Phase 1',
    domain: 'SUDESTADA',
    agent: 'sudestada',
    status: 'ACTIVE',
    priority: 'P1',
    last_action: 'Stealth phase. First inbound advisory client in pipeline.',
    last_action_date: today,
    next_action: 'Qualify $6-7M advisory portfolio lead',
    next_action_date: today,
    dependencies: [],
    notes: 'Wyoming LLC, EIN 36-5141312. 8 revenue streams. Phase 1 stealth through Sep 2026.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-005',
    name: 'Maldecidos — Feature Film',
    domain: 'FILM',
    agent: 'film',
    status: 'ACTIVE',
    priority: 'P1',
    last_action: 'Shoot confirmed for July 13, 2026',
    last_action_date: today,
    next_action: 'Pre-production checklist review',
    next_action_date: today,
    dependencies: [],
    notes: 'Urban Achievers S.A. Confirmed shoot date July 13, 2026.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-006',
    name: 'Academia de Cine del Paraguay — Presidency Candidacy',
    domain: 'FILM',
    agent: 'film',
    status: 'ACTIVE',
    priority: 'P2',
    last_action: 'Candidacy declared ACTIVE',
    last_action_date: today,
    next_action: 'Develop platform and outreach strategy',
    next_action_date: today,
    dependencies: [],
    notes: 'D-002. Running for President.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-007',
    name: 'Inteligencia Financiera — Season',
    domain: 'MEDIA',
    agent: 'media',
    status: 'ACTIVE',
    priority: 'P2',
    last_action: 'Ongoing production cycle',
    last_action_date: today,
    next_action: 'Plan next episode and guest pipeline',
    next_action_date: today,
    dependencies: [],
    notes: 'Host + Executive Producer. 100,000+ views/episode. Ñanduti media holding.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-008',
    name: 'PhD Dissertation — Cultural Resistance under Stroessner',
    domain: 'PHD',
    agent: 'research_personal',
    status: 'ACTIVE',
    priority: 'P2',
    last_action: 'Active research and writing',
    last_action_date: today,
    next_action: 'Continue archival work — Rudi Torga / Teatro Estudio Libre',
    next_action_date: today,
    dependencies: [],
    notes: 'Universidad Nacional de Asunción. Focus: Father Rudi Torga, Teatro Estudio Libre, Mandu\'arã.',
    created_at: now,
    updated_at: now,
  },
  {
    project_id: 'PRJ-009',
    name: 'Renegade OS — Build',
    domain: 'PERSONAL',
    agent: 'research_personal',
    status: 'ACTIVE',
    priority: 'P1',
    last_action: 'Day 1 scaffold complete',
    last_action_date: today,
    next_action: 'Day 2: Agent engine and chat interface',
    next_action_date: today,
    dependencies: [],
    notes: 'Personal executive OS. 5-day build plan. Future commercial SaaS.',
    created_at: now,
    updated_at: now,
  },
]

// ─── decisions.json ───────────────────────────────────────────────────────────

const decisions: Decision[] = [
  {
    decision_id: 'D-001',
    date: '2026-04-01',
    domain: 'SUDESTADA',
    title: 'Left Itacuá Bienes y Raíces',
    rationale: 'Separated from Itacuá. Real estate advisory moves entirely into Sudestada Holdings.',
    implications: [
      'No Itacuá domain or agent in Renegade OS',
      'Real estate portfolio tracked under SUDESTADA',
    ],
    linked_projects: ['PRJ-004'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-002',
    date: '2026-04-01',
    domain: 'FILM',
    title: 'Running for President — Academia de Cine del Paraguay',
    rationale: 'Strategic positioning in Paraguayan film ecosystem.',
    implications: ['Candidacy is ACTIVE P2 under FILM domain'],
    linked_projects: ['PRJ-006'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-003',
    date: '2026-04-10',
    domain: 'PERSONAL',
    title: 'Renegade OS: Option B deployment (Next.js + Vercel)',
    rationale: 'Full Next.js app from day one. Server-side API calls. Same pattern as sudestadaholdings.com.',
    implications: [
      'Deployed on Vercel at renegade.reneruizdiaz.com',
      'Google Drive via Service Account',
      'Password-gated middleware',
    ],
    linked_projects: ['PRJ-009'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-004',
    date: '2026-04-10',
    domain: 'PERSONAL',
    title: 'CostRouter is a standing module inherited by all agents',
    rationale: 'Mandatory cost discipline. Not optional or configurable per agent.',
    implications: ['All agents use lib/cost-router.ts — no direct Anthropic SDK calls'],
    linked_projects: ['PRJ-009'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-005',
    date: '2026-04-10',
    domain: 'PERSONAL',
    title: '7 agents — Research + Personal combined for Phase 1',
    rationale: 'Simplicity for Phase 1. Split into separate agents in Phase 2 if PhD work intensifies.',
    implications: ['research_personal agent covers both PHD and PERSONAL domains'],
    linked_projects: ['PRJ-009'],
    status: 'STANDING',
  },
]

// ─── opportunities.json ───────────────────────────────────────────────────────

const opportunities: Opportunity[] = [
  {
    opportunity_id: 'OPP-001',
    name: 'First Inbound Advisory Client — Sudestada',
    domain: 'SUDESTADA',
    source: 'Inbound referral',
    type: 'ADVISORY',
    size_estimate: '$6-7M portfolio',
    probability: 'HIGH',
    next_action: 'Qualify client and scope engagement',
    next_action_date: today,
    linked_contact: '',
    status: 'LIVE',
    notes: 'First inbound lead for Sudestada advisory business. Phase 1 stealth context.',
  },
]

// ─── empty arrays ─────────────────────────────────────────────────────────────

const contacts: Contact[] = []
const commitments: Commitment[] = []
const sessions: Session[] = []

// ─── Write to Drive ───────────────────────────────────────────────────────────

async function main() {
  console.log('Initializing Drive files…')

  await updateDriveFile('projects.json', projects)
  console.log('✓ projects.json')

  await updateDriveFile('decisions.json', decisions)
  console.log('✓ decisions.json')

  await updateDriveFile('opportunities.json', opportunities)
  console.log('✓ opportunities.json')

  await updateDriveFile('contacts.json', contacts)
  console.log('✓ contacts.json')

  await updateDriveFile('commitments.json', commitments)
  console.log('✓ commitments.json')

  await updateDriveFile('sessions.json', sessions)
  console.log('✓ sessions.json')

  console.log('\nDrive initialization complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
