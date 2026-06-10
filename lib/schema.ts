// ─── Projects ────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'ACTIVE'
  | 'WATCH'
  | 'STALLED'
  | 'ON_HOLD'
  | 'DORMANT'
  | 'CLOSED'
  | 'SOMEDAY'
export type ProjectPriority = 'P1' | 'P2' | 'P3'
export type Domain =
  | 'CAPITAL_MARKETS'
  | 'NEWCO'
  | 'SUDESTADA'
  | 'FILM'
  | 'MEDIA'
  | 'PHD'
  | 'PERSONAL'

export type Agent =
  | 'chief_of_staff'
  | 'capital_markets'
  | 'newco'
  | 'sudestada'
  | 'film'
  | 'media'
  | 'research_personal'

export interface Project {
  project_id: string
  name: string
  domain: Domain
  agent: Agent
  status: ProjectStatus
  priority: ProjectPriority
  milestone?: string
  counterparty?: string
  last_action: string
  last_action_date?: string
  next_action: string
  next_action_date: string
  dependencies?: string[]
  notes: string
  created_at?: string
  updated_at?: string
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export type RelationshipType =
  | 'DEAL'
  | 'PARTNER'
  | 'INVESTOR'
  | 'TALENT'
  | 'INSTITUTIONAL'
  | 'PERSONAL'
  | 'MEDIA'

export type RelationshipTemp = 'HOT' | 'WARM' | 'COOL' | 'DORMANT'

export interface Contact {
  contact_id: string
  full_name: string
  company: string
  title: string
  domain: Domain[]
  relationship_type: RelationshipType
  relationship_temp: RelationshipTemp
  last_touchpoint: string
  last_touchpoint_note: string
  next_action: string
  next_action_date: string
  linked_projects: string[]
  notes: string
}

// ─── Decisions ───────────────────────────────────────────────────────────────

export type DecisionStatus = 'STANDING' | 'SUPERSEDED'

export interface Decision {
  decision_id: string
  date: string
  domain: Domain | 'CROSS'
  title: string
  rationale: string
  implications: string[]
  linked_projects: string[]
  status: DecisionStatus
  superseded_by?: string
}

// ─── Commitments ─────────────────────────────────────────────────────────────

export type CommitmentStatus = 'OPEN' | 'DELIVERED' | 'MISSED' | 'CANCELLED'

export interface Commitment {
  commitment_id: string
  description: string
  promised_to: string
  promised_date: string
  due_date: string
  domain: Domain
  linked_project: string
  status: CommitmentStatus
}

// ─── Opportunities ───────────────────────────────────────────────────────────

export type OpportunityType =
  | 'ADVISORY'
  | 'DEAL'
  | 'MEDIA'
  | 'COPRODUCTION'
  | 'ACADEMIC'
  | 'SPEAKING'
  | 'OTHER'

export type OpportunityProbability = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export type OpportunityStatus =
  | 'LIVE'
  | 'QUALIFIED'
  | 'DORMANT'
  | 'PASSED'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export interface Opportunity {
  opportunity_id: string
  name: string
  domain: Domain
  source: string
  type: OpportunityType
  size_estimate: string
  probability: OpportunityProbability
  next_action: string
  next_action_date: string
  linked_contact: string
  status: OpportunityStatus
  notes: string
  updated_at?: string
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface Session {
  session_id: string
  date: string
  agent: Agent
  summary: string
  outputs: string[]
  linked_projects: string[]
  follow_ups: string[]
}

// ─── Drive data shape ────────────────────────────────────────────────────────

export interface DriveData {
  'projects.json': Project[]
  'contacts.json': Contact[]
  'decisions.json': Decision[]
  'commitments.json': Commitment[]
  'opportunities.json': Opportunity[]
  'sessions.json': Session[]
  'daily-brief.json': any
}

export type DriveFileName = keyof DriveData
