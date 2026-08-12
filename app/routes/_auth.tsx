import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { AuthLayout } from '#/shared/components/layout/auth-layout'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
