/**
 * Generates the 6 seed JSON files locally under scripts/drive-seed/
 * Upload those files to your Drive folder, then the service account
 * can read and update them freely.
 *
 * Run: npx tsx scripts/generate-seed-files.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type {
  Project,
  Decision,
  Contact,
  Commitment,
  Opportunity,
  Session,
} from '../lib/schema'

const outDir = join(process.cwd(), 'scripts', 'drive-seed')
mkdirSync(outDir, { recursive: true })

const now = new Date().toISOString()

// ─── projects.json ────────────────────────────────────────────────────────────

const projects: Project[] = [
  {
    project_id: 'P-001',
    name: 'Costa Food $200M financing',
    domain: 'CAPITAL_MARKETS',
    agent: 'capital_markets',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Structuring phase — financial model in progress',
    counterparty: 'Costa Food / Banco Continental',
    last_action: 'Internal structuring discussions ongoing',
    next_action: 'Confirm financial model assumptions with Continental team',
    next_action_date: '2026-04-18',
    notes: 'Agri-food plant financing. ~$200M. Key deal for Avalon.',
  },
  {
    project_id: 'P-002',
    name: 'GCF Direct Access advisory',
    domain: 'CAPITAL_MARKETS',
    agent: 'capital_markets',
    status: 'WATCH',
    priority: 'P2',
    milestone: 'Opportunity identification — Paraguay lacks GCF DAE',
    counterparty: 'Green Climate Fund',
    last_action: 'Identified gap: no GCF Direct Access Entity in Paraguay',
    next_action: 'Map potential institutional sponsors for DAE application',
    next_action_date: '2026-04-30',
    notes: 'High-value advisory if the right institutional partner found.',
  },
  {
    project_id: 'P-003',
    name: 'Avalon Fondos AA+ maintenance',
    domain: 'CAPITAL_MARKETS',
    agent: 'capital_markets',
    status: 'ACTIVE',
    priority: 'P2',
    milestone: 'Ongoing — rating confirmed',
    counterparty: 'Rating agency',
    last_action: 'AA+ rating maintained',
    next_action: 'Monitor portfolio composition for next review cycle',
    next_action_date: '2026-06-01',
    notes: 'Avalon Administradora de Fondos Patrimoniales.',
  },
  {
    project_id: 'P-004',
    name: 'Project Newco July MVP',
    domain: 'NEWCO',
    agent: 'newco',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Architecture phase — product scope being defined',
    counterparty: 'Banco Continental Group',
    last_action: 'Took Lead Board Member + Project Manager role (April 2026)',
    next_action: 'Define MVP scope with Continental team — two-product platform',
    next_action_date: '2026-04-20',
    notes: 'Crypto custody (Lirium AG) + tokenized land via fideicomiso.',
  },
  {
    project_id: 'P-005',
    name: 'Lirium AG partnership',
    domain: 'NEWCO',
    agent: 'newco',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Primary technology partner confirmed',
    counterparty: 'Lirium AG',
    last_action: 'Lirium AG identified as primary tech partner',
    next_action: 'Advance technical integration discussions',
    next_action_date: '2026-04-25',
    notes: 'Crypto custody and digital asset infrastructure.',
  },
  {
    project_id: 'P-006',
    name: 'Sudestada Phase 1 pipeline',
    domain: 'SUDESTADA',
    agent: 'sudestada',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Stealth mode — pipeline building through Sep 2026',
    counterparty: 'Multiple — international capital targets',
    last_action: 'sudestadaholdings.com live in 4 languages',
    next_action: 'Activate expert network profiles (GLG, AlphaSights)',
    next_action_date: '2026-04-20',
    notes: '8 revenue streams. Phase 2 full-time from October 2026.',
  },
  {
    project_id: 'P-007',
    name: 'Advisory portfolio lead ($6-7M)',
    domain: 'SUDESTADA',
    agent: 'sudestada',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Inbound lead — proposal stage',
    counterparty: 'Friend / personal contact',
    last_action: 'Friend asked René to propose managing his portfolio',
    next_action: 'Draft advisory fee proposal and investment mandate',
    next_action_date: '2026-04-17',
    notes: 'First validation of independent advisory practice thesis.',
  },
  {
    project_id: 'P-008',
    name: 'Maldecidos — July 13 shoot',
    domain: 'FILM',
    agent: 'film',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Pre-production — crew and locations being locked',
    counterparty: 'Gabriela Sabaté (advisory producer)',
    last_action: 'Gabriela Sabaté engaged — 3 modules, 15% commission',
    next_action: 'Confirm key crew positions and location permits',
    next_action_date: '2026-05-01',
    notes: '90 scenes, 23-day schedule. FONDEC + INAP + Ibermedia.',
  },
  {
    project_id: 'P-009',
    name: 'Spanish co-producer pitch',
    domain: 'FILM',
    agent: 'film',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Pitch in development',
    counterparty: 'TBD — Spanish production company',
    last_action: 'Pitch strategy being developed',
    next_action: 'Identify top 3 Spanish co-production targets',
    next_action_date: '2026-04-25',
    notes: 'Target: Cannes/AFM late 2027.',
  },
  {
    project_id: 'P-010',
    name: 'Academia de Cine — candidacy',
    domain: 'FILM',
    agent: 'film',
    status: 'ACTIVE',
    priority: 'P2',
    milestone: 'Decision made — building candidacy platform',
    counterparty: 'Academia de Cine del Paraguay',
    last_action: 'Decision to run confirmed April 10, 2026',
    next_action: 'Finalize team of four and draft candidacy one-pager',
    next_action_date: '2026-04-20',
    notes: 'Team: René, Seba Peña, Richard Careaga, Gabriela Sabaté.',
  },
  {
    project_id: 'P-011',
    name: 'IFI episode pipeline',
    domain: 'MEDIA',
    agent: 'media',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Ongoing — weekly production cadence',
    counterparty: 'Ñanduti media holding',
    last_action: 'IDB Assembly episode produced with Dr. Benigno López',
    next_action: 'Define next episode topic and confirm guest',
    next_action_date: '2026-04-17',
    notes: '100,000+ views per episode.',
  },
  {
    project_id: 'P-012',
    name: 'PhD dissertation — UNA',
    domain: 'PHD',
    agent: 'research_personal',
    status: 'ACTIVE',
    priority: 'P2',
    milestone: 'Proposal drafted — moving to primary source phase',
    counterparty: 'Universidad Nacional de Asunción',
    last_action: 'Dissertation proposal drafted',
    next_action: 'Schedule oral history interviews with surviving collaborators',
    next_action_date: '2026-05-15',
    notes: 'Stroessner era, Teatro Estudio Libre, father Rudi Torga.',
  },
  {
    project_id: 'P-013',
    name: 'Renegade OS — Build',
    domain: 'PERSONAL',
    agent: 'research_personal',
    status: 'ACTIVE',
    priority: 'P1',
    milestone: 'Day 3 — Morning briefing generator',
    last_action: 'Day 2 complete — streaming chat and Drive context working',
    next_action: 'Day 4: Build all 6 domain agent pages',
    next_action_date: '2026-04-11',
    notes: 'Personal executive OS. 5-day build. Future commercial SaaS.',
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
    linked_projects: ['P-006'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-002',
    date: '2026-04-10',
    domain: 'FILM',
    title: 'Running for President — Academia de Cine del Paraguay',
    rationale: 'Strategic positioning in Paraguayan film ecosystem.',
    implications: ['Candidacy is ACTIVE P2 under FILM domain'],
    linked_projects: ['P-010'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-003',
    date: '2026-04-10',
    domain: 'PERSONAL',
    title: 'Renegade OS: Next.js + Vercel deployment',
    rationale: 'Full Next.js app from day one. Same pattern as sudestadaholdings.com.',
    implications: [
      'Deployed on Vercel at renegade.reneruizdiaz.com',
      'Google Drive via Service Account',
      'Password-gated proxy',
    ],
    linked_projects: ['P-013'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-004',
    date: '2026-04-10',
    domain: 'NEWCO',
    title: 'René takes Lead Board Member + PM role on Project Newco',
    rationale: 'Banco Continental Group engaged René to lead the build. July 31 MVP is non-negotiable.',
    implications: [
      'Newco is P1 alongside Maldecidos — sequencing risk if July gets crowded',
      'Board alignment required before June 30',
    ],
    linked_projects: ['P-004', 'P-005'],
    status: 'STANDING',
  },
  {
    decision_id: 'D-005',
    date: '2026-04-10',
    domain: 'SUDESTADA',
    title: '$6-7M advisory lead is highest Sudestada priority',
    rationale: 'First inbound client validates the independent advisory thesis. Move fast.',
    implications: [
      'Fee proposal due April 17',
      'All other Sudestada architecture work is secondary until this is closed',
    ],
    linked_projects: ['P-007'],
    status: 'STANDING',
  },
]

// ─── opportunities.json ───────────────────────────────────────────────────────

const opportunities: Opportunity[] = [
  {
    opportunity_id: 'O-001',
    name: 'Portfolio advisory mandate — $6-7M',
    domain: 'SUDESTADA',
    source: 'Personal contact — inbound',
    type: 'ADVISORY',
    size_estimate: '$6-7M AUM, fee TBD',
    probability: 'HIGH',
    next_action: 'Draft advisory fee proposal and investment mandate',
    next_action_date: '2026-04-17',
    linked_contact: '',
    status: 'LIVE',
    notes: 'First validation of independent practice. Move fast.',
  },
]

const contacts: Contact[] = []
const commitments: Commitment[] = []
const sessions: Session[] = []

// ─── Write files ──────────────────────────────────────────────────────────────

const files = {
  'projects.json': projects,
  'decisions.json': decisions,
  'opportunities.json': opportunities,
  'contacts.json': contacts,
  'commitments.json': commitments,
  'sessions.json': sessions,
}

for (const [name, data] of Object.entries(files)) {
  const filePath = join(outDir, name)
  writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`✓ ${filePath}`)
}

console.log(`\nDone. Upload all 6 files from scripts/drive-seed/ to your Drive folder.`)
