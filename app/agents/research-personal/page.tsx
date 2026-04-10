import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function ResearchPersonalPage() {
  const agent = getAgent('research-personal')

  return (
    <AgentPageLayout
      agentId="research-personal"
      agentName="Research & Personal Agent"
      domainTag="PHD + PERSONAL"
      description="PhD dissertation on Stroessner-era cultural resistance, Rudi Torga, and personal strategy."
      domains={['PHD', 'PERSONAL']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
