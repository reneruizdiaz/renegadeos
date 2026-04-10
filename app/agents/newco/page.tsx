import AgentPageLayout from '@/components/AgentPageLayout'
import { getAgent } from '@/lib/agents'

export default function NewcoPage() {
  const agent = getAgent('newco')

  return (
    <AgentPageLayout
      agentId="newco"
      agentName="Newco Agent"
      domainTag="NEWCO"
      description="Digital assets, tokenization, and real-world assets — Project Newco at Banco Continental Group."
      domains={['NEWCO']}
      starterPrompts={agent.starterPrompts}
    />
  )
}
