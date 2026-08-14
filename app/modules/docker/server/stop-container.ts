import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { runContainerActionTracked } from './track-container-action'

const actionInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
})

export const stopContainerFn = createServerFn({ method: 'POST' })
  .validator(actionInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.UPDATE)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    await runContainerActionTracked({
      environment,
      environmentId: data.environmentId,
      containerId: data.containerId,
      action: 'stop',
      run: async (docker) => {
        const container = docker.getContainer(data.containerId)
        await container.stop()
      },
    })

    return { success: true as const, containerId: data.containerId, action: 'stop' as const }
  })
