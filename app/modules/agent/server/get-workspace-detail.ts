import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findWorkspaceById } from '../infrastructure/workspace-repository'
import { findMountsByWorkspace } from '../infrastructure/workspace-mount-repository'
import { hasWorkspaceAssignment } from '../infrastructure/workspace-assignment-repository'

const getWorkspaceDetailInput = z.object({
  workspaceId: z.string().uuid(),
})

export const getWorkspaceDetailFn = createServerFn({ method: 'GET' })
  .validator(getWorkspaceDetailInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const workspace = await findWorkspaceById(data.workspaceId)
    if (!workspace) {
      throw new Error('WORKSPACE_NOT_FOUND')
    }

    const hasAssignment = await hasWorkspaceAssignment(user.id, data.workspaceId)
    if (!hasAssignment) {
      throw new Error('FORBIDDEN')
    }

    const mounts = await findMountsByWorkspace(data.workspaceId)

    return { workspace, mounts }
  })
