import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/shared/components/layout/auth-layout'

export const Route = createFileRoute('/_auth')({
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
