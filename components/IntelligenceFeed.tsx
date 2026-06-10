'use client'

import { useState, useEffect } from 'react'

interface BriefArticle {
  title: string
  link: string
  pubDate: string
  source: string
}

interface BriefEntry {
  id: string
  name: string
  type: string
  domain: string
  why: string
  articles: BriefArticle[]
  summary: string
  has_signal: boolean
  fetched_at: string
}

interface DailyBrief {
  generated_at: string
  date: string
  coffee_brief: string | null
  signal_of_day: string | null
  signal_reason: string | null
  synthesis_error?: string | null
  total_entries_checked: number
  total_with_signal: number
  by_domain: Record<string, BriefEntry[]>
}

const DOMAIN_LABELS: Record<string, string> = {
  NEWCO: 'Newco',
  CAPITAL_MARKETS: 'Capital Markets',
  FILM: 'Film & Creative',
  MEDIA: 'Media',
  SUDESTADA: 'Sudestada',
  PHD: 'Research',
  PERSONAL: 'Personal',
}

function formatGeneratedAt(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function shortDate(pubDate: string): string {
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function IntelligenceFeed() {
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/daily-brief')
      .then((r) => r.json())
      .then((data) => { setBrief(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded border border-[#1E1E21] bg-[#111113] p-5 animate-pulse mb-8">
        <div className="h-2 w-32 bg-[#1E1E21] rounded mb-3" />
        <div className="h-3 w-full bg-[#1E1E21] rounded mb-2" />
        <div className="h-3 w-3/4 bg-[#1E1E21] rounded" />
      </div>
    )
  }

  if (!brief) return null

  const synthesisFailed =
    Boolean(brief.synthesis_error) || (brief.coffee_brief?.startsWith('⚠️') ?? false)

  const domains = Object.entries(brief.by_domain ?? {}).filter(
    ([, entries]) => entries.length > 0
  )

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">
          Daily Intelligence
        </p>
        <span className="text-[#6B6868] text-[10px]">
          {formatGeneratedAt(brief.generated_at)} · {brief.total_with_signal}/{brief.total_entries_checked} sources with signal
        </span>
      </div>

      {/* Coffee brief */}
      {brief.coffee_brief && (
        <div
          className={`rounded border p-5 mb-3 ${
            synthesisFailed
              ? 'border-[#8B0000] bg-[#1A0E0E]'
              : 'border-[#1E1E21] bg-[#111113]'
          }`}
        >
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
            synthesisFailed ? 'text-[#D9A0A0]' : 'text-[#E8E6E1]'
          }`}>
            {brief.coffee_brief}
          </p>
        </div>
      )}

      {/* Signal of the day */}
      {brief.signal_of_day && (
        <div className="rounded border border-[#C8920A] bg-[#15120A] p-4 mb-3">
          <p className="text-[#C8920A] text-[10px] tracking-widest uppercase mb-1">
            Señal del día
          </p>
          <p className="text-[#E8E6E1] text-sm leading-relaxed">{brief.signal_of_day}</p>
          {brief.signal_reason && (
            <p className="text-[#A8A5A0] text-xs mt-1">{brief.signal_reason}</p>
          )}
        </div>
      )}

      {/* Per-domain entries */}
      {domains.length > 0 && (
        <div className="space-y-2">
          {domains.map(([domain, entries]) => {
            const expanded = expandedDomain === domain
            return (
              <div
                key={domain}
                className="rounded border border-[#1E1E21] bg-[#111113] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedDomain(expanded ? null : domain)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0D0D0F] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#E8E6E1] text-xs font-medium">
                      {DOMAIN_LABELS[domain] ?? domain}
                    </span>
                    <span className="text-[#6B6868] text-[10px]">
                      {entries.length} signal{entries.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[#6B6868] text-[10px]">{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#1E1E21] space-y-4">
                    {entries.map((e) => (
                      <div key={e.id}>
                        <p className="text-[#C8920A] text-xs font-medium mb-1">{e.name}</p>
                        <p className="text-[#A8A5A0] text-xs leading-relaxed whitespace-pre-wrap mb-2">
                          {e.summary}
                        </p>
                        {e.articles.length > 0 && (
                          <ul className="space-y-1">
                            {e.articles.map((a, i) => (
                              <li key={i} className="text-[11px] leading-snug">
                                <a
                                  href={a.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#A8A5A0] hover:text-[#E8E6E1] underline decoration-[#2E2E31] underline-offset-2 transition-colors"
                                >
                                  {a.title}
                                </a>
                                <span className="text-[#6B6868]">
                                  {' '}— {a.source || 'link'}{shortDate(a.pubDate) ? ` · ${shortDate(a.pubDate)}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
