import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/configuration/')({
  beforeLoad: () => {
    throw redirect({ to: '/configuration/projects' })
  },
})
