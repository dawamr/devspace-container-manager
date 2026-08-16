import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { deleteWorkspace } from '../infrastructure/workspace-repository'

const deleteWorkspaceInput = z.object({
  id: z.string().uuid(),
})

export const deleteWorkspaceFn = createServerFn({ method: 'POST' })
  .validator(deleteWorkspaceInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.DELETE)

    await deleteWorkspace(data.id)

    return { success: true as const }
  })
