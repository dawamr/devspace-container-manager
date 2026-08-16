import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findByContainerId } from '../infrastructure/container-registry-repository'
import { withDocker } from '../infrastructure/docker-client'
import { parseDockerLogs, type ContainerLogLine } from './container-logs'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const input = z.object({
  containerId: z.string().min(1),
  tail: z.number().int().min(1).max(1000).default(200),
  since: z.number().optional(),
  timestamps: z.boolean().default(true),
})

const envInput = z.object({
  containerId: z.string().min(1),
})

/**
 * Resolve the environmentId for a container from the container_registry.
 *
 * Used by flat `/containers/$id/logs` route to obtain the environmentId
 * needed by `ContainerLogsViewer` without requiring it as a URL param.
 */
export const getContainerEnvironmentIdFn = createServerFn({ method: 'GET' })
  .validator(envInput)
  .handler(async ({ data }): Promise<string> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    const registryEntry = await findByContainerId(data.containerId, projectIds)

    if (!registryEntry) {
      throw new Error('CONTAINER_NOT_FOUND')
    }

    return registryEntry.environmentId
  })

/**
 * Fetch Docker container logs via the flat `/containers/$id/logs` route.
 *
 * Resolves the environment from the container_registry (not from URL params),
 * authorizes CONTAINERS.READ + LOGS.READ, then queries Docker Engine directly.
 * Mirrors `inspectContainerByIdFn` for registry resolution and `containerLogsFn`
 * for the log-fetch + parse + analytics logic.
 */
export const containerLogsByIdFn = createServerFn({ method: 'GET' })
  .validator(input)
  .handler(async ({ data }): Promise<ContainerLogLine[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)
    await requirePermission(RESOURCES.LOGS, ACTIONS.READ)

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

    const rawStream = await withDocker(
      'containerLogs',
      (docker) =>
        docker.getContainer(data.containerId).logs({
          stdout: true,
          stderr: true,
          follow: false,
          tail: data.tail,
          since: data.since ?? 0,
          timestamps: data.timestamps,
        }),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    const lines = parseDockerLogs(rawStream as Buffer, data.timestamps)

    await captureServerEvent('container_logs_viewed', {
      containerId: data.containerId,
      environmentId: registryEntry.environmentId,
      lineCount: lines.length,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return lines
  })
