import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { deleteExistingRole } from '../domain/role-service'

const deleteRoleInput = z.object({ id: z.string().uuid() })

export const deleteRoleFn = createServerFn({ method: 'POST' })
  .validator(deleteRoleInput)
  .handler(async ({ data }) => {
    await requirePermission('users', 'delete')
    await deleteExistingRole(data.id)
    return { success: true }
  })
