import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { removeAssignment } from '../infrastructure/container-assignment-repository'

const unassignInput = z.object({
  containerRegistryId: z.string().uuid(),
  userId: z.string().uuid(),
})

export const unassignContainerFn = createServerFn({ method: 'POST' })
  .validator(unassignInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.CONTAINERS, ACTIONS.ASSIGN)

    await removeAssignment(data.containerRegistryId, data.userId)

    await captureServerEvent('container_unassigned', {
      containerRegistryId: data.containerRegistryId,
      unassignedUserId: data.userId,
      removedBy: user.id,
    })

    return {
      success: true as const,
      containerRegistryId: data.containerRegistryId,
      userId: data.userId,
    }
  })
