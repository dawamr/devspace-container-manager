import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAssignmentsByUser } from '../infrastructure/workspace-assignment-repository'

const listInput = z.object({
  userId: z.string().uuid(),
})

export const listUserWorkspaceAssignmentsFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const assignments = await findAssignmentsByUser(data.userId)

    return {
      workspaceIds: assignments.map((a) => a.workspace.id),
    }
  })
