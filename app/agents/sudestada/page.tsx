import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function SudestadaPage() {
  const agent = getAgent('sudestada')

  return (
    <AgentPageLayout
      agentId="sudestada"
      agentName="Sudestada Agent"
      domainTag="SUDESTADA"
      description="Cross-border advisory, 8 revenue streams, personal real estate. Phase 1 stealth through September 2026."
      domains={['SUDESTADA']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
