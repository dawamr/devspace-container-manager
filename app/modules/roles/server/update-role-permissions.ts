import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateRolePermissions, updateRolePermissionsSchema } from '../domain/role-service'

export const updateRolePermissionsFn = createServerFn({ method: 'POST' })
  .validator(updateRolePermissionsSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'update')
    await updateRolePermissions(data.roleId, data.permissionIds)
    return { success: true }
  })
