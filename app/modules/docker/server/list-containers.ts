import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { mapContainerInfo, type ContainerSummary } from '../domain/docker-types'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const listInput = z.object({
  environmentId: z.string().uuid(),
})

/**
 * List all containers (including stopped) for a given Environment.
 *
 * Server-side only: resolves the Environment's Docker host from the DB,
 * authorizes CONTAINERS.READ, then queries Docker Engine directly via
 * dockerode. Docker state is never replicated to PostgreSQL.
 *
 * All Docker failures are funneled through `withDocker`, which classifies
 * the error and retries transient (unreachable/5xx) failures with backoff.
 *
 * Emits `container_list_viewed` (Sprint 2 / H1) with the rendered container
 * count and the request duration in ms.
 */
export const listContainersFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async ({ data }): Promise<ContainerSummary[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    const startedAt = performance.now()

    const containers = await withDocker(
      'listContainers',
      (docker) => docker.listContainers({ all: true }),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
      },
    )

    const mapped = containers.map(mapContainerInfo)

    await captureServerEvent('container_list_viewed', {
      environmentId: data.environmentId,
      containerCount: mapped.length,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return mapped
  })
