import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { mapContainerStats, type ContainerStats } from '../domain/docker-types'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const statsInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
})

/**
 * Fetch Docker container resource stats (CPU, memory, network, block I/O).
 *
 * Server-side only: resolves the Environment's Docker host from the DB,
 * authorizes CONTAINERS.READ, then queries Docker Engine via dockerode.
 * Returns a normalized `ContainerStats` snapshot (non-streaming).
 *
 * All Docker failures are funneled through `withDocker`, which classifies
 * the error and retries transient failures with backoff.
 *
 * Emits `container_stats_viewed` with the request duration.
 */
export const containerStatsFn = createServerFn({ method: 'GET' })
  .validator(statsInput)
  .handler(async ({ data }): Promise<ContainerStats> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
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
      environmentId: data.environmentId,
      containerId: data.containerId,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return stats
  })
