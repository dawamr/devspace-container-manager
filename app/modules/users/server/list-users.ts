import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getUsers } from '../domain/user-service'

export const listUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getUsers()
})
