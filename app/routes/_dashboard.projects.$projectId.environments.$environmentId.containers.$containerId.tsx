import { createFileRoute, Link, Outlet, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Tabs } from 'radix-ui'
import { useQuery } from '@tanstack/react-query'

import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'
import type { ContainerDetail } from '#/modules/docker/domain/docker-types'
import { Badge } from '#/shared/ui/badge'
import { cn } from '#/shared/lib/cn'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId',
)({
  component: ContainerDetailLayout,
})

function ContainerDetailLayout() {
  const { projectId, environmentId, containerId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId',
  })

  const { data: detail } = useQuery({
    queryKey: ['container-inspect', environmentId, containerId],
    queryFn: async (): Promise<ContainerDetail> =>
      inspectContainerFn({ data: { environmentId, containerId } }) as Promise<ContainerDetail>,
  })

  const currentPath = window.location.pathname
  const activeTab = currentPath.endsWith('/inspect') ? 'inspect' : 'logs'

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/projects/$projectId/environments/$environmentId/containers"
        params={{ projectId, environmentId }}
        className="inline-flex w-fit items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Kembali ke containers
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-card-foreground">
          {detail?.name ?? containerId.slice(0, 12)}
        </h1>
        {detail && (
          <>
            <Badge variant="outline" className="capitalize">{detail.state}</Badge>
            <HealthBadge health={detail.health} />
          </>
        )}
      </div>

      <Tabs.Root value={activeTab}>
        <Tabs.List className="flex gap-1 border-b border-[var(--glass-border)]">
          <Tabs.Trigger
            value="logs"
            className={cn(
              'rounded-t-md px-4 py-2 text-sm font-medium text-white/60',
              'data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white',
            )}
            asChild
          >
            <Link
              to="/projects/$projectId/environments/$environmentId/containers/$containerId/logs"
              params={{ projectId, environmentId, containerId }}
            >
              Logs
            </Link>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="inspect"
            className={cn(
              'rounded-t-md px-4 py-2 text-sm font-medium text-white/60',
              'data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white',
            )}
            asChild
          >
            <Link
              to="/projects/$projectId/environments/$environmentId/containers/$containerId/inspect"
              params={{ projectId, environmentId, containerId }}
            >
              Inspect
            </Link>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Outlet />
    </div>
  )
}
