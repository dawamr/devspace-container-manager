import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { mapContainerInspect, type ContainerDetail } from '../domain/docker-types'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const inspectInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
})

/**
 * Inspect a single Docker container and return its rich detail view.
 *
 * Server-side only: resolves the Environment's Docker host from the DB,
 * authorizes CONTAINERS.READ, then queries Docker Engine directly via
 * dockerode. Docker state is never replicated to PostgreSQL.
 *
 * All Docker failures are funneled through `withDocker`, which classifies
 * the error and retries transient (unreachable/5xx) failures with backoff.
 *
 * Emits `container_inspected` with the request duration in ms.
 */
export const inspectContainerFn = createServerFn({ method: 'GET' })
  .validator(inspectInput)
  .handler(async ({ data }): Promise<ContainerDetail> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    const startedAt = performance.now()

    const inspectInfo = await withDocker(
      'inspectContainer',
      (docker) => docker.getContainer(data.containerId).inspect(),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    const detail = mapContainerInspect(inspectInfo)

    await captureServerEvent('container_inspected', {
      environmentId: data.environmentId,
      containerId: data.containerId,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return detail
  })
