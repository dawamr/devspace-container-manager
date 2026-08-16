import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { getContainerEnvironmentIdFn } from '#/modules/docker/server/container-logs-by-id'
import { ContainerLogsViewer } from '#/modules/docker/presentation/container-logs-viewer'

export const Route = createFileRoute('/_dashboard/containers/$containerId/logs')({
  component: ContainerLogsByIdPage,
})

function ContainerLogsByIdPage() {
  const { containerId } = Route.useParams()

  const { data: environmentId, isLoading } = useQuery({
    queryKey: ['container-environment-id', containerId],
    queryFn: () => getContainerEnvironmentIdFn({ data: { containerId } }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    )
  }

  if (!environmentId) {
    return (
      <div className="py-12 text-center text-sm text-white/50">
        Container tidak ditemukan atau tidak dapat diakses.
      </div>
    )
  }

  return <ContainerLogsViewer environmentId={environmentId} containerId={containerId} />
}
