import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/infrastructure')({
  beforeLoad: () => {
    throw redirect({ to: '/configuration/infrastructure' })
  },
})
