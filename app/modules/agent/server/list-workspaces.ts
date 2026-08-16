import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAssignmentsByUser } from '../infrastructure/workspace-assignment-repository'

const listInput = z.object({}).optional()

export interface WorkspaceSummary {
  id: string
  name: string
  rootPath: string
  containerRegistryId: string | null
  isActive: boolean
}

export const listWorkspacesFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async () => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const assignments = await findAssignmentsByUser(user.id)

    const workspaces: WorkspaceSummary[] = assignments.map((a) => ({
      id: a.workspace.id,
      name: a.workspace.name,
      rootPath: a.workspace.rootPath,
      containerRegistryId: a.workspace.containerRegistryId,
      isActive: a.workspace.isActive,
    }))

    return { workspaces }
  })
