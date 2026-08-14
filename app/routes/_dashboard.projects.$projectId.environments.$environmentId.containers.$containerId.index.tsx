import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
      params,
    })
  },
})
