import { createFileRoute, useParams } from '@tanstack/react-router'

import { ContainerLogsViewer } from '#/modules/docker/presentation/container-logs-viewer'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
)({
  component: ContainerLogsPage,
})

function ContainerLogsPage() {
  const { environmentId, containerId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
  })

  return <ContainerLogsViewer environmentId={environmentId} containerId={containerId} />
}
