import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { DashboardShell } from '#/shared/components/layout/dashboard-shell'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user }
  },
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  )
}
