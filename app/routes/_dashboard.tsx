import { Outlet, createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '#/shared/components/layout/dashboard-shell'

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  )
}
