import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getPermissions } from '../domain/role-service'

export const listPermissionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getPermissions()
})
