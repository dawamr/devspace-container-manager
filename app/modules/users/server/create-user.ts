import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { createNewUser, createUserSchema } from '../domain/user-service'

export const createUserFn = createServerFn({ method: 'POST' })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'create')
    const userId = await createNewUser(data, currentUser.id)
    return { success: true, userId }
  })
