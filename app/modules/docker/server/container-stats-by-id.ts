import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findByContainerId } from '../infrastructure/container-registry-repository'
import { withDocker } from '../infrastructure/docker-client'
import { mapContainerStats, type ContainerStats } from '../domain/docker-types'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const input = z.object({
  containerId: z.string().min(1),
})

/**
 * Fetch container resource stats by its Docker ID via the flat
 * `/containers/$id/stats` route.
 *
 * Resolves the environment from the container_registry (not from URL params),
 * authorizes CONTAINERS.READ, then queries Docker Engine directly.
 */
export const containerStatsByIdFn = createServerFn({ method: 'GET' })
  .validator(input)
  .handler(async ({ data }): Promise<ContainerStats> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    const registryEntry = await findByContainerId(data.containerId, projectIds)

    if (!registryEntry) {
      throw new Error('CONTAINER_NOT_FOUND')
    }

    const environment = await findEnvironmentById(registryEntry.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    const startedAt = performance.now()

    const rawStats = await withDocker(
      'containerStats',
      (docker) => docker.getContainer(data.containerId).stats({ stream: false }),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    const stats = mapContainerStats(rawStats as any)

    await captureServerEvent('container_stats_viewed', {
      containerId: data.containerId,
      environmentId: registryEntry.environmentId,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return stats
  })
