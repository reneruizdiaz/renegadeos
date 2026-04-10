import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function MediaPage() {
  const agent = getAgent('media')

  return (
    <AgentPageLayout
      agentId="media"
      agentName="Media Agent"
      domainTag="MEDIA"
      description="Inteligencia Financiera production, content pipeline, and René's public voice."
      domains={['MEDIA']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
