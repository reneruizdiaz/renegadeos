import AgentChat from '@/components/AgentChat'
import { getAgent } from '@/lib/agents'

export default function CapitalMarketsPage() {
  const agent = getAgent('capital-markets')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1E1E21]">
        <p className="text-[#C8920A] text-[10px] tracking-widest uppercase">
          Capital Markets
        </p>
        <h1 className="font-[family-name:var(--font-newsreader)] text-2xl text-[#E8E6E1] mt-0.5">
          {agent.name}
        </h1>
        <p className="text-[#6B6868] text-xs mt-1">
          Avalon Casa de Bolsa · Avalon Fondos · BVPASA
        </p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <AgentChat
          agentId="capital-markets"
          agentName={agent.name}
          starterPrompts={agent.starterPrompts}
        />
      </div>
    </div>
  )
}
