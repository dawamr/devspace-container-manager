import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/administration/')({
  beforeLoad: () => {
    throw redirect({ to: '/administration/users' })
  },
})
