'use client'

/**
 * UsageCard — Anthropic API cost widget
 * Drop this at the bottom of DomainNav.tsx, inside the sidebar container,
 * below all nav links.
 *
 * Usage:
 *   import UsageCard from '@/components/UsageCard'
 *   <UsageCard />
 */

import { useEffect, useState } from 'react'

type UsageData = {
  today_cost:  number | null
  month_cost:  number | null
  unavailable?: boolean
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '–'
  return `$${n.toFixed(4)}`
}

export default function UsageCard() {
  const [data,    setData]    = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d: UsageData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setData({ today_cost: null, month_cost: null, unavailable: true })
        setLoading(false)
      })
  }, [])

  return (
    <div
      style={{
        marginTop:    '24px',
        padding:      '10px 12px',
        borderTop:    '1px solid rgba(255,255,255,0.06)',
        fontFamily:   '"JetBrains Mono", "Fira Mono", monospace',
        fontSize:     '11px',
        lineHeight:   '1.6',
        color:        'rgba(255,255,255,0.35)',
        letterSpacing: '0.03em',
      }}
    >
      <div
        style={{
          fontSize:      '9px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.22)',
          marginBottom:  '6px',
        }}
      >
        API Usage
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.18)' }}>···</div>
      ) : data?.unavailable && data.today_cost === null ? (
        <div style={{ color: 'rgba(255,255,255,0.18)' }}>Usage: –</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ paddingRight: '12px', color: 'rgba(255,255,255,0.3)' }}>Today</td>
              <td style={{ textAlign: 'right', color: 'rgba(0,255,136,0.6)' }}>
                {fmt(data?.today_cost ?? null)}
              </td>
            </tr>
            <tr>
              <td style={{ paddingRight: '12px', color: 'rgba(255,255,255,0.3)' }}>This month</td>
              <td style={{ textAlign: 'right', color: 'rgba(0,255,136,0.6)' }}>
                {fmt(data?.month_cost ?? null)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
