import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function FilmPage() {
  const agent = getAgent('film')

  return (
    <AgentPageLayout
      agentId="film"
      agentName="Film & Creative Agent"
      domainTag="FILM"
      description="Urban Achievers production, Maldecidos pre-production, and Academia de Cine candidacy."
      domains={['FILM']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
