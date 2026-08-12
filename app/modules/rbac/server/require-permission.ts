import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { checkPermissionWithBypass } from '#/modules/rbac/domain/permission-service'
import type { Resource, Action } from '#/modules/rbac/domain/constants'

export async function requirePermission(
  resource: Resource,
  action: Action,
): Promise<{ id: string; email: string; name: string; roleName: string }> {
  const user = await getCurrentUserFn()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  const allowed = await checkPermissionWithBypass(user.roleName, resource, action)
  if (!allowed) {
    throw new Error('FORBIDDEN')
  }
  return user
}
