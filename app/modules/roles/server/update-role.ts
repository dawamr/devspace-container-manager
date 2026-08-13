import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingRole, updateRoleSchema } from '../domain/role-service'

export const updateRoleFn = createServerFn({ method: 'POST' })
  .validator(updateRoleSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'update')
    await updateExistingRole(data.id, { name: data.name, description: data.description })
    return { success: true }
  })
