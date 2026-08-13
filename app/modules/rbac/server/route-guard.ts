// app/modules/rbac/server/route-guard.ts
import { redirect } from '@tanstack/react-router'
import { checkPermissionFn } from './check-permission'
import type { Resource, Action } from '../domain/constants'
import type { AuthUser } from '#/modules/auth/domain/auth-service'

type BeforeLoadContext = {
  context: { user: AuthUser }
}

export function createRouteGuard(resource: Resource, action: Action) {
  return async ({ context }: BeforeLoadContext) => {
    const allowed = await checkPermissionFn({ data: { roleName: context.user.roleName, resource, action } })
    if (!allowed) {
      throw redirect({ to: '/forbidden' })
    }
  }
}
