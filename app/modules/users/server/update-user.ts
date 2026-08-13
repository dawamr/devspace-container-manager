import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingUser, updateUserSchema } from '../domain/user-service'

export const updateUserFn = createServerFn({ method: 'POST' })
  .validator(updateUserSchema)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'update')
    await updateExistingUser(data, currentUser.id)
    return { success: true }
  })
