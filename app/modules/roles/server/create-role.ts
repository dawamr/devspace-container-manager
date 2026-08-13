import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { createNewRole, createRoleSchema } from '../domain/role-service'

export const createRoleFn = createServerFn({ method: 'POST' })
  .validator(createRoleSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'create')
    const role = await createNewRole(data.name, data.description)
    return { success: true, roleId: role.id }
  })
