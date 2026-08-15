import { createFileRoute, useParams } from '@tanstack/react-router'

import { ContainerInspectViewer } from '#/modules/docker/presentation/container-inspect-viewer'

export const Route = createFileRoute(
  '/_dashboard/configuration/projects/$projectId/environments/$environmentId/containers/$containerId/inspect',
)({
  component: ContainerInspectPage,
})

function ContainerInspectPage() {
  const { environmentId, containerId } = useParams({
    from: '/_dashboard/configuration/projects/$projectId/environments/$environmentId/containers/$containerId/inspect',
  })

  return <ContainerInspectViewer environmentId={environmentId} containerId={containerId} />
}
