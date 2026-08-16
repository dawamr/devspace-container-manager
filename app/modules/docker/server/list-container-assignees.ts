import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import {
  findAssigneesByContainerId,
  type AssigneeWithUser,
} from '../infrastructure/container-assignment-repository'

export interface ContainerAssignee {
  id: string
  userId: string
  name: string
  email: string
  role: string
  assignedAt: string
}

const listInput = z.object({
  containerRegistryId: z.string().uuid(),
})

export const listContainerAssigneesFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async ({ data }): Promise<ContainerAssignee[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const rows: AssigneeWithUser[] = await findAssigneesByContainerId(
      data.containerRegistryId,
    )

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: r.role,
      assignedAt: r.assignedAt.toISOString(),
    }))
  })
