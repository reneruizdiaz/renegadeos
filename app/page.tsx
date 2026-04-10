'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BriefingCard from '@/components/BriefingCard'
import AgentChat from '@/components/AgentChat'

interface DomainSummary {
  agentId: string
  name: string
  subtitle: string
  href: string
  activePriority1Count: number
  nextAction: string | null
  nextActionDate: string | null
}

interface SessionRecord {
  session_id: string
  date: string
  agent: string
  summary: string
  outputs: string[]
  linked_projects: string[]
  follow_ups: string[]
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function agentLabel(agentId: string): string {
  const map: Record<string, string> = {
    'chief-of-staff': 'Chief of Staff',
    'chief_of_staff': 'Chief of Staff',
    'capital-markets': 'Capital Markets',
    'capital_markets': 'Capital Markets',
    newco: 'Newco',
    sudestada: 'Sudestada',
    film: 'Film & Creative',
    media: 'Media',
    'research-personal': 'Research',
    research_personal: 'Research',
  }
  return map[agentId] ?? agentId
}

export default function Home() {
  const [domains, setDomains] = useState<DomainSummary[]>([])
  const [domainsLoading, setDomainsLoading] = useState(true)
  const [briefing, setBriefing] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  useEffect(() => {
    fetch('/api/context')
      .then((r) => r.json())
      .then((data) => { setDomains(data); setDomainsLoading(false) })
      .catch(() => setDomainsLoading(false))

    fetch('/api/session?limit=5')
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [])

  async function generateBriefing() {
    if (streaming) return
    setBriefing('')
    setGeneratedAt(null)
    setStreaming(true)

    try {
      const res = await fetch('/api/briefing', { method: 'POST' })

      if (!res.ok || !res.body) {
        const body = await res.text()
        let detail = body
        try { detail = JSON.parse(body).error } catch {}
        throw new Error(`${res.status}: ${detail}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setBriefing((prev) => prev + decoder.decode(value, { stream: true }))
      }

      setGeneratedAt(new Date())
    } catch (err) {
      setBriefing(`Error: ${err instanceof Error ? err.message : 'Failed to generate briefing.'}`)
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] px-6 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[#C8920A] text-[10px] tracking-widest uppercase mb-1">
            Executive Intelligence
          </p>
          <div className="flex items-baseline justify-between">
            <h1 className="font-[family-name:var(--font-newsreader)] text-3xl text-[#E8E6E1]">
              Renegade OS
            </h1>
            <span className="text-[#6B6868] text-xs">{today}</span>
          </div>
        </div>

        {/* Domain cards — skeleton while loading */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {domainsLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="rounded border border-[#1E1E21] bg-[#111113] p-4 animate-pulse">
                  <div className="h-3 w-24 bg-[#1E1E21] rounded mb-2" />
                  <div className="h-2 w-16 bg-[#1E1E21] rounded mb-4" />
                  <div className="h-3 w-20 bg-[#1E1E21] rounded" />
                </div>
              ))
            : domains.map((d) => (
                <Link
                  key={d.agentId}
                  href={d.href}
                  className="block rounded border border-[#1E1E21] bg-[#111113] p-4 hover:border-[#8B0000] transition-colors"
                >
                  <p className="text-[#E8E6E1] text-sm font-medium mb-0.5">{d.name}</p>
                  <p className="text-[#6B6868] text-[10px] mb-3">{d.subtitle}</p>
                  {d.activePriority1Count > 0 ? (
                    <>
                      <p className="text-[#C8920A] text-xs mb-1">{d.activePriority1Count} P1 active</p>
                      {d.nextActionDate && (
                        <p className="text-[#6B6868] text-[10px]">Next: {formatDate(d.nextActionDate)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[#6B6868] text-[10px]">No P1 projects</p>
                  )}
                </Link>
              ))
          }
        </div>

        {/* Briefing button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={generateBriefing}
            disabled={streaming}
            className="px-8 py-3 rounded bg-[#8B0000] text-[#E8E6E1] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {streaming ? 'Generating…' : 'Generate Morning Briefing'}
          </button>
        </div>

        {/* Briefing output */}
        {(briefing || streaming) && (
          <BriefingCard
            content={briefing}
            generatedAt={generatedAt}
            streaming={streaming}
          />
        )}

        {/* Recent Sessions */}
        <div className="mt-10">
          <div className="border-t border-[#1E1E21] pt-6 mb-4">
            <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">
              Recent Sessions
            </p>
          </div>

          {sessions.length === 0 ? (
            <p className="text-[#6B6868] text-xs">No sessions saved yet. Use "End &amp; Save Session" in any agent to log a conversation.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const expanded = expandedSession === s.session_id
                const firstSentence = s.summary.split(/[.!?]/)[0] ?? s.summary
                return (
                  <div
                    key={s.session_id}
                    className="rounded border border-[#1E1E21] bg-[#111113] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedSession(expanded ? null : s.session_id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#0D0D0F] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[#6B6868] text-[10px] shrink-0">{formatDateTime(s.date)}</span>
                        <span className="text-[#C8920A] text-[10px] shrink-0">{agentLabel(s.agent)}</span>
                        <span className="text-[#A8A5A0] text-xs truncate">{firstSentence}.</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {s.follow_ups.length > 0 && (
                          <span className="text-[#6B6868] text-[10px]">{s.follow_ups.length} follow-up{s.follow_ups.length !== 1 ? 's' : ''}</span>
                        )}
                        <span className="text-[#6B6868] text-[10px]">{expanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#1E1E21] space-y-3">
                        <p className="text-[#E8E6E1] text-sm leading-relaxed">{s.summary}</p>
                        {s.outputs.length > 0 && (
                          <div>
                            <p className="text-[#6B6868] text-[10px] uppercase tracking-wider mb-1">Outputs</p>
                            <ul className="space-y-0.5">
                              {s.outputs.map((o, i) => (
                                <li key={i} className="text-[#A8A5A0] text-xs">· {o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.follow_ups.length > 0 && (
                          <div>
                            <p className="text-[#6B6868] text-[10px] uppercase tracking-wider mb-1">Follow-ups</p>
                            <ul className="space-y-0.5">
                              {s.follow_ups.map((f, i) => (
                                <li key={i} className="text-[#A8A5A0] text-xs">· {f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Follow-up chat */}
        <div className="mt-10">
          <div className="border-t border-[#1E1E21] pt-6 mb-4">
            <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">Chief of Staff</p>
            <p className="text-[#6B6868] text-xs mt-0.5">Ask follow-up questions about the briefing or any domain</p>
          </div>
          <div className="h-[500px] rounded border border-[#1E1E21] overflow-hidden">
            <AgentChat
              agentId="chief-of-staff"
              agentName="Chief of Staff"
              starterPrompts={[]}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
