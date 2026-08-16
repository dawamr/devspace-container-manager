import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import {
  findAssignmentsByUser,
  createAssignment,
  deleteAssignment,
} from '../infrastructure/workspace-assignment-repository'

const updateInput = z.object({
  userId: z.string().uuid(),
  workspaceIds: z.array(z.string().uuid()),
})

export const updateUserWorkspacesFn = createServerFn({ method: 'POST' })
  .validator(updateInput)
  .handler(async ({ data }) => {
    const admin = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.ASSIGN)

    // Fetch current assignments
    const existing = await findAssignmentsByUser(data.userId)
    const existingIds = new Set(existing.map((a) => a.workspace.id))
    const requestedIds = new Set(data.workspaceIds)

    // Compute diff
    const toAdd = data.workspaceIds.filter((id) => !existingIds.has(id))
    const toRemove = existing
      .filter((a) => !requestedIds.has(a.workspace.id))
      .map((a) => a.workspace.id)

    // Apply: create new assignments
    for (const workspaceId of toAdd) {
      await createAssignment({
        workspaceId,
        userId: data.userId,
        role: 'developer',
        assignedBy: admin.id,
      })
    }

    // Apply: delete removed assignments
    for (const workspaceId of toRemove) {
      await deleteAssignment(workspaceId, data.userId)
    }

    // Track in PostHog
    await captureServerEvent('agent_workspace_assignment_updated', {
      userId: data.userId,
      added: toAdd.length,
      removed: toRemove.length,
      updatedBy: admin.id,
    })

    return {
      added: toAdd.length,
      removed: toRemove.length,
    }
  })
