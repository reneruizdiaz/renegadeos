'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BriefingCard from '@/components/BriefingCard'

interface DomainSummary {
  agentId: string
  name: string
  subtitle: string
  href: string
  activePriority1Count: number
  nextAction: string | null
  nextActionDate: string | null
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function Home() {
  const [domains, setDomains] = useState<DomainSummary[]>([])
  const [briefing, setBriefing] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [streaming, setStreaming] = useState(false)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  useEffect(() => {
    fetch('/api/context')
      .then((r) => r.json())
      .then(setDomains)
      .catch(console.error)
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
        try {
          detail = JSON.parse(body).error
        } catch {}
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
      setBriefing(
        `Error: ${err instanceof Error ? err.message : 'Failed to generate briefing.'}`
      )
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

        {/* Domain cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {domains.map((d) => (
            <Link
              key={d.agentId}
              href={d.href}
              className="block rounded border border-[#1E1E21] bg-[#111113] p-4 hover:border-[#8B0000] transition-colors"
            >
              <p className="text-[#E8E6E1] text-sm font-medium mb-0.5">
                {d.name}
              </p>
              <p className="text-[#6B6868] text-[10px] mb-3">{d.subtitle}</p>
              {d.activePriority1Count > 0 ? (
                <>
                  <p className="text-[#C8920A] text-xs mb-1">
                    {d.activePriority1Count} P1 active
                  </p>
                  {d.nextActionDate && (
                    <p className="text-[#6B6868] text-[10px]">
                      Next: {formatDate(d.nextActionDate)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[#6B6868] text-[10px]">No P1 projects</p>
              )}
            </Link>
          ))}
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
      </div>
    </div>
  )
}
