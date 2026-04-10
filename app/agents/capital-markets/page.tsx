import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function CapitalMarketsPage() {
  const agent = getAgent('capital-markets')

  return (
    <AgentPageLayout
      agentId="capital-markets"
      agentName="Capital Markets Agent"
      domainTag="CAPITAL MARKETS"
      description="Avalon Casa de Bolsa · Avalon Fondos · BVPASA — deal flow, structured finance, and institutional capital markets."
      domains={['CAPITAL_MARKETS']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
