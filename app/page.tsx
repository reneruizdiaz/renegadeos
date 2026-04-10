import DomainNav from '@/components/DomainNav'
import AgentChat from '@/components/AgentChat'
import { getAgent } from '@/lib/agents'

export default function Home() {
  const agent = getAgent('chief-of-staff')

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0B]">
      <DomainNav />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E1E21]">
          <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">
            Executive Intelligence
          </p>
          <h1 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#E8E6E1] mt-0.5">
            Chief of Staff
          </h1>
          <p className="text-[#6B6868] text-xs mt-1">
            Cross-domain synthesis · Morning briefings · Priority actions
          </p>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <AgentChat
            agentId="chief-of-staff"
            agentName="Chief of Staff"
            starterPrompts={agent.starterPrompts}
          />
        </div>
      </main>
    </div>
  )
}
