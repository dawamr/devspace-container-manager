import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { updateWorkspace } from '../infrastructure/workspace-repository'

const updateWorkspaceInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  containerRegistryId: z.string().uuid().nullable().optional(),
  rootPath: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
})

export const updateWorkspaceFn = createServerFn({ method: 'POST' })
  .validator(updateWorkspaceInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.UPDATE)

    const { id, ...updateData } = data
    const workspace = await updateWorkspace(id, updateData)
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND')
    }

    return { workspace }
  })
