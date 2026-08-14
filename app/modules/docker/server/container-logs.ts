import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const logsInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
  tail: z.number().int().min(1).max(1000).default(200),
  since: z.number().optional(),
  timestamps: z.boolean().default(true),
})

export interface ContainerLogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

/**
 * Fetch Docker container logs (non-following).
 *
 * Server-side only: resolves the Environment's Docker host from the DB,
 * authorizes CONTAINERS.READ + LOGS.READ, then queries Docker Engine via
 * dockerode. Returns parsed log lines with optional timestamps.
 *
 * All Docker failures are funneled through `withDocker`, which classifies
 * the error and retries transient failures with backoff.
 *
 * Emits `container_logs_viewed` with the request duration and line count.
 */
export const containerLogsFn = createServerFn({ method: 'GET' })
  .validator(logsInput)
  .handler(async ({ data }): Promise<ContainerLogLine[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)
    await requirePermission(RESOURCES.LOGS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
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
      environmentId: data.environmentId,
      containerId: data.containerId,
      lineCount: lines.length,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return lines
  })

/**
 * Parse the raw Docker log buffer into structured log lines.
 *
 * Docker's non-following log output concatenates stdout + stderr into a
 * single buffer. When `timestamps: true` is set, each line is prefixed
 * with an RFC3339 timestamp followed by a space.
 */
function parseDockerLogs(
  raw: Buffer,
  withTimestamps: boolean,
): ContainerLogLine[] {
  const text = raw.toString('utf-8')
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map((line) => {
      let timestamp = ''
      let message = line

      if (withTimestamps) {
        const match = line.match(
          /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/,
        )
        if (match) {
          timestamp = match[1]
          message = match[2]
        }
      }

      return { timestamp, stream: 'stdout' as const, message }
    })
}
