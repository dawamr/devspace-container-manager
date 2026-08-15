import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getRolePermissions } from '../domain/role-service'

const input = z.object({ roleId: z.string().uuid() })

export const getRolePermissionsFn = createServerFn({ method: 'GET' })
  .validator(input)
  .handler(async ({ data }) => {
    await requirePermission('users', 'read')
    return await getRolePermissions(data.roleId)
  })
