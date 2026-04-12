import { NextResponse } from 'next/server'

/**
 * GET /api/usage
 * Server-side proxy for Anthropic usage API.
 * Keeps ANTHROPIC_API_KEY off the client.
 */
export async function GET() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Today's date range (UTC)
    const now       = new Date()
    const todayStr  = now.toISOString().split('T')[0]          // YYYY-MM-DD
    const monthStart = `${todayStr.slice(0, 7)}-01`            // YYYY-MM-01

    // Fetch today's usage
    const [todayRes, monthRes] = await Promise.all([
      fetch(
        `https://api.anthropic.com/v1/usage?start_date=${todayStr}&end_date=${todayStr}`,
        {
          headers: {
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
          },
          next: { revalidate: 300 }, // cache 5 min
        }
      ),
      fetch(
        `https://api.anthropic.com/v1/usage?start_date=${monthStart}&end_date=${todayStr}`,
        {
          headers: {
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
          },
          next: { revalidate: 300 },
        }
      ),
    ])

    // If the usage endpoint doesn't exist or returns 404/401, fail quietly
    if (!todayRes.ok || !monthRes.ok) {
      return NextResponse.json({
        today_cost:  null,
        month_cost:  null,
        unavailable: true,
      })
    }

    const todayData = await todayRes.json()
    const monthData = await monthRes.json()

    // Anthropic usage API returns { data: [{ cost_usd, ... }] }
    const sumCost = (data: { data?: Array<{ cost_usd?: number }> }) =>
      (data.data ?? []).reduce((acc, row) => acc + (row.cost_usd ?? 0), 0)

    return NextResponse.json({
      today_cost: sumCost(todayData),
      month_cost: sumCost(monthData),
      today_date: todayStr,
      month_start: monthStart,
    })
  } catch {
    // Fail quietly — usage card shows "–"
    return NextResponse.json({ today_cost: null, month_cost: null, unavailable: true })
  }
}
