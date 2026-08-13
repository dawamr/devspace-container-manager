import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getRoles } from '../domain/role-service'

export const listRolesFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getRoles()
})
