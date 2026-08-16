import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { bulkUpsertAssignments } from '../infrastructure/container-assignment-repository'

const assignmentItem = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'operator', 'observer']).default('operator'),
})

const assignInput = z.object({
  containerRegistryId: z.string().uuid(),
  assignments: z.array(assignmentItem).min(1),
})

export const assignContainerFn = createServerFn({ method: 'POST' })
  .validator(assignInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.CONTAINERS, ACTIONS.ASSIGN)

    const result = await bulkUpsertAssignments({
      containerRegistryId: data.containerRegistryId,
      assignments: data.assignments,
      assignedBy: user.id,
    })

    await captureServerEvent('container_assigned', {
      containerRegistryId: data.containerRegistryId,
      assignedUsers: data.assignments.map((a) => ({ userId: a.userId, role: a.role })),
      assignedBy: user.id,
      count: result.length,
    })

    return {
      success: true as const,
      containerRegistryId: data.containerRegistryId,
      assignedCount: result.length,
    }
  })
