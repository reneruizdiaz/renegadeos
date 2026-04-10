'use client'

import { useState, useEffect } from 'react'
import AgentChat from './AgentChat'
import type { Project } from '@/lib/schema'

interface AgentPageLayoutProps {
  agentId: string
  agentName: string
  domainTag: string
  description: string
  domains: string[]       // e.g. ['CAPITAL_MARKETS'] or ['PHD', 'PERSONAL']
  starterPrompts: string[]
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function AgentPageLayout({
  agentId,
  agentName,
  domainTag,
  description,
  domains,
  starterPrompts,
}: AgentPageLayoutProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = domains.join(',')
    fetch(`/api/projects?domains=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data: Project[]) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [domains.join(',')])

  // Show P1 first; if none, fall back to P2
  const p1 = projects.filter((p) => p.status !== 'CLOSED' && p.priority === 'P1')
  const displayProjects = p1.length > 0
    ? p1
    : projects.filter((p) => p.status !== 'CLOSED' && p.priority === 'P2')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E1E21] shrink-0">
        <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">
          {domainTag}
        </p>
        <h1 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#E8E6E1] mt-0.5">
          {agentName}
        </h1>
        <p className="text-[#6B6868] text-xs mt-1">{description}</p>
      </div>

      {/* Active Projects Panel */}
      <div className="px-6 py-4 border-b border-[#1E1E21] shrink-0">
        <p className="text-[#6B6868] text-[10px] tracking-widest uppercase mb-3">
          Active Projects
        </p>

        {loading ? (
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded border border-[#1E1E21] bg-[#0D0D0F] px-4 py-3 min-w-[200px] max-w-[300px] flex-1 animate-pulse">
                <div className="h-3 w-32 bg-[#1E1E21] rounded mb-2" />
                <div className="h-2 w-40 bg-[#1E1E21] rounded mb-3" />
                <div className="h-2 w-16 bg-[#1E1E21] rounded" />
              </div>
            ))}
          </div>
        ) : displayProjects.length === 0 ? (
          <p className="text-[#6B6868] text-xs">No active projects.</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {displayProjects.map((p) => (
              <div
                key={p.project_id}
                className="rounded border border-[#1E1E21] bg-[#0D0D0F] px-4 py-3 min-w-[200px] max-w-[300px] flex-1"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[#E8E6E1] text-xs font-medium leading-snug">
                    {p.name}
                  </p>
                  <span className="shrink-0 text-[9px] font-semibold tracking-wider text-[#8B0000] border border-[#8B0000]/40 rounded px-1.5 py-0.5">
                    {p.priority}
                  </span>
                </div>
                {p.milestone && (
                  <p className="text-[#6B6868] text-[11px] leading-snug mb-2">
                    {p.milestone}
                  </p>
                )}
                {p.next_action_date && (
                  <p className="text-[#C8920A] text-[10px]">
                    Next: {formatDate(p.next_action_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <AgentChat
          agentId={agentId as import('@/lib/agents').AgentId}
          agentName={agentName}
          starterPrompts={starterPrompts}
        />
      </div>
    </div>
  )
}
