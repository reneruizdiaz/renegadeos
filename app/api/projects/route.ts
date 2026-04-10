import { NextRequest } from 'next/server'
import { getDriveFile } from '@/lib/drive'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domainsParam = searchParams.get('domains') ?? ''
    const domains = domainsParam
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    const all = await getDriveFile('projects.json')

    const filtered =
      domains.length === 0
        ? all
        : all.filter((p) => domains.includes(p.domain))

    // Sort: ACTIVE before WATCH, then P1 before P2, then by next_action_date
    filtered.sort((a, b) => {
      const statusOrder: Record<string, number> = { ACTIVE: 0, WATCH: 1, STALLED: 2, SOMEDAY: 3, CLOSED: 4 }
      const priOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2 }
      const sA = statusOrder[a.status] ?? 5
      const sB = statusOrder[b.status] ?? 5
      if (sA !== sB) return sA - sB
      const pA = priOrder[a.priority] ?? 3
      const pB = priOrder[b.priority] ?? 3
      if (pA !== pB) return pA - pB
      if (!a.next_action_date) return 1
      if (!b.next_action_date) return -1
      return a.next_action_date.localeCompare(b.next_action_date)
    })

    return Response.json(filtered)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
