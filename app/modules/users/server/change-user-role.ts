import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingUser } from '../domain/user-service'

const changeRoleInput = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
})

export const changeUserRoleFn = createServerFn({ method: 'POST' })
  .validator(changeRoleInput)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'update')
    await updateExistingUser({ id: data.userId, roleId: data.roleId }, currentUser.id)
    return { success: true }
  })
