import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { checkPermissionWithBypass } from '../domain/permission-service'
import { RESOURCES, ACTIONS } from '../domain/constants'
import type { Resource, Action } from '../domain/constants'

const checkPermissionInput = z.object({
  roleName: z.string(),
  resource: z.enum(Object.values(RESOURCES) as [Resource, ...Resource[]]),
  action: z.enum(Object.values(ACTIONS) as [Action, ...Action[]]),
})

export const checkPermissionFn = createServerFn({ method: 'GET' })
  .validator(checkPermissionInput)
  .handler(async ({ data }) => {
    return await checkPermissionWithBypass(data.roleName, data.resource, data.action)
  })
