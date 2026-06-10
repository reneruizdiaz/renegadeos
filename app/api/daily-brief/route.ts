import { getDriveFile } from '@/lib/drive'

export const dynamic = 'force-dynamic'

// GET /api/daily-brief — serve the latest cron-generated intelligence brief
export async function GET() {
  try {
    const brief = await getDriveFile('daily-brief.json')
    return Response.json(brief)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/daily-brief]', message)
    return Response.json(null, { status: 200 }) // degrade gracefully
  }
}
