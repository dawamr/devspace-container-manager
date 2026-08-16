import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findContainerIdsByUserId } from '../infrastructure/container-assignment-repository'

const listInput = z.object({}).optional()

export const listUserContainersFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async () => {
    const user = await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const containerIds = await findContainerIdsByUserId(user.id)

    return {
      userId: user.id,
      containerRegistryIds: containerIds,
    }
  })
