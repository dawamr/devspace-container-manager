import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_dashboard/configuration/projects/$projectId/environments/$environmentId/containers/$containerId/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/configuration/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
      params,
    })
  },
})
