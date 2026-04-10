import { getDriveFile } from '@/lib/drive'

export const dynamic = 'force-dynamic'

const DOMAIN_CONFIG = [
  {
    agentId: 'chief-of-staff',
    domain: null as string | null,
    name: 'Chief of Staff',
    subtitle: 'Orchestration',
    href: '/',
  },
  {
    agentId: 'capital-markets',
    domain: 'CAPITAL_MARKETS',
    name: 'Capital Markets',
    subtitle: 'Avalon · BVPASA',
    href: '/agents/capital-markets',
  },
  {
    agentId: 'newco',
    domain: 'NEWCO',
    name: 'Newco',
    subtitle: 'Tokenization · July MVP',
    href: '/agents/newco',
  },
  {
    agentId: 'sudestada',
    domain: 'SUDESTADA',
    name: 'Sudestada',
    subtitle: 'Cross-border advisory',
    href: '/agents/sudestada',
  },
  {
    agentId: 'film',
    domain: 'FILM',
    name: 'Film & Creative',
    subtitle: 'Maldecidos · Academia',
    href: '/agents/film',
  },
  {
    agentId: 'media',
    domain: 'MEDIA',
    name: 'Media',
    subtitle: 'Inteligencia Financiera',
    href: '/agents/media',
  },
  {
    agentId: 'research-personal',
    domain: 'PHD',
    name: 'Research',
    subtitle: 'PhD · Torga Archives',
    href: '/agents/research-personal',
  },
]

export async function GET() {
  try {
    const projects = await getDriveFile('projects.json')

    const result = DOMAIN_CONFIG.map(({ agentId, domain, name, subtitle, href }) => {
      const p1Active = projects.filter(
        (p) =>
          p.status === 'ACTIVE' &&
          p.priority === 'P1' &&
          (domain === null || p.domain === domain)
      )

      p1Active.sort((a, b) => {
        if (!a.next_action_date) return 1
        if (!b.next_action_date) return -1
        return a.next_action_date.localeCompare(b.next_action_date)
      })

      const soonest = p1Active[0]

      return {
        agentId,
        name,
        subtitle,
        href,
        activePriority1Count: p1Active.length,
        nextAction: soonest?.next_action ?? null,
        nextActionDate: soonest?.next_action_date ?? null,
      }
    })

    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
