import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findStackById } from '../infrastructure/stack-registry-repository'
import { findContainersByStack } from '../infrastructure/container-registry-repository'
import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { withDocker } from '../infrastructure/docker-client'
import { captureServerEvent } from '#/shared/lib/posthog-server'

const ACTION_SCHEMA = z.enum(['start', 'stop', 'restart'])

/**
 * Apply a bulk action (start/stop/restart) to all containers in a stack.
 *
 * Resolves the environment's Docker host from DB, then calls Docker Engine
 * for each container. Returns per-container results.
 */
export const stackBulkActionFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      action: ACTION_SCHEMA,
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.UPDATE)

    const stack = await findStackById(data.stackId)
    if (!stack) throw new Error('Stack not found')

    const containers = await findContainersByStack(stack.environmentId, stack.name)
    if (containers.length === 0) {
      return { actioned: 0, errors: [] }
    }

    const env = await findEnvironmentById(stack.environmentId)
    if (!env) throw new Error('Environment not found')

    const results: { containerId: string; success: boolean; error?: string }[] = []

    for (const c of containers) {
      try {
        await withDocker(
          'stackBulkAction',
          (docker) => {
            const container = docker.getContainer(c.containerId)
            switch (data.action) {
              case 'start':
                return container.start()
              case 'stop':
                return container.stop()
              case 'restart':
                return container.restart()
            }
          },
          { dockerHost: env.dockerHost, dockerCertPath: env.dockerCertPath },
        )
        results.push({ containerId: c.containerId, success: true })
      } catch (err) {
        results.push({
          containerId: c.containerId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    await captureServerEvent('stack_bulk_action', {
      stackId: stack.id,
      action: data.action,
      total: containers.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })

    return {
      actioned: results.filter((r) => r.success).length,
      errors: results.filter((r) => !r.success),
    }
  })
