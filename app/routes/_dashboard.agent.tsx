import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PanelLeftOpen } from 'lucide-react'
import { Button } from '#/shared/ui/button'
import { listWorkspacesFn, type WorkspaceSummary } from '#/modules/agent/server/list-workspaces'
import { startAgentSessionFn } from '#/modules/agent/server/start-agent-session'
import { getWorkspaceDetailFn } from '#/modules/agent/server/get-workspace-detail'
import { WorkspaceSelector } from '#/modules/agent/presentation/workspace-selector'
import { ContainerStatus } from '#/modules/agent/presentation/container-status'
import { FileSidebar } from '#/modules/agent/presentation/file-sidebar'
import { ChatPanel } from '#/modules/agent/presentation/chat-panel'

export const Route = createFileRoute('/_dashboard/agent')({
  component: AgentPage,
})

function AgentPage() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => listWorkspacesFn({ data: {} }),
  })

  // Prime the cache for child components that may read workspace detail
  useQuery({
    queryKey: ['workspace-detail', selectedWorkspace?.id],
    queryFn: () => getWorkspaceDetailFn({ data: { workspaceId: selectedWorkspace!.id } }),
    enabled: !!selectedWorkspace?.id,
  })

  const startSession = useMutation({
    mutationFn: (workspace: WorkspaceSummary) =>
      startAgentSessionFn({
        data: {
          workspaceId: workspace.id,
          containerRegistryId: workspace.containerRegistryId ?? undefined,
        },
      }),
    onSuccess: (data) => setSessionId(data.sessionId),
  })

  useEffect(() => {
    if (selectedWorkspace) {
      startSession.mutate(selectedWorkspace)
      setSessionId(null)
    }
  }, [selectedWorkspace?.id])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <WorkspaceSelector
          workspaces={workspacesData?.workspaces ?? []}
          selectedId={selectedWorkspace?.id ?? null}
          onSelect={setSelectedWorkspace}
        />
        {selectedWorkspace && (
          <ContainerStatus
            containerName={selectedWorkspace.containerRegistryId ? 'assigned' : null}
            status={null}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && selectedWorkspace && (
          <div className="w-64 shrink-0">
            <FileSidebar
              workspaceId={selectedWorkspace.id}
              onCollapse={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <div className="flex-1">
          <ChatPanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  )
}
