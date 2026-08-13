import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { deleteExistingUser } from '../domain/user-service'

const deleteUserInput = z.object({ id: z.string().uuid() })

export const deleteUserFn = createServerFn({ method: 'POST' })
  .validator(deleteUserInput)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'delete')
    await deleteExistingUser(data.id, currentUser.id)
    return { success: true }
  })
