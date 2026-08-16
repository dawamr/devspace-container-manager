import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { PageHeader } from '#/shared/ui/glass-card'
import { AgentSettingsPanel } from '#/modules/agent/presentation/agent-settings-panel'

export const Route = createFileRoute('/_dashboard/administration/agent-settings')({
  beforeLoad: createRouteGuard('users', 'update'),
  staticData: { title: 'Agent Settings' },
  component: AgentSettingsPage,
})

function AgentSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agent Settings"
        description="Konfigurasi LLM API key, model, token budget, dan tool limit untuk AI agent."
      />
      <AgentSettingsPanel />
    </div>
  )
}
