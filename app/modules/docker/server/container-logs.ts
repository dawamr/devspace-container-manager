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
 * Docker's non-following log output uses a multiplexed stream format:
 * each chunk is preceded by an 8-byte header —
 *   byte 0:      stream type (1 = stdout, 2 = stderr)
 *   bytes 1-3:   reserved (zeros)
 *   bytes 4-7:   payload length (big-endian uint32)
 * followed by `payloadLength` bytes of actual log content.
 *
 * When `timestamps: true` is set, each payload line is prefixed with an
 * RFC3339 timestamp followed by a space.
 *
 * Exported so other server functions can reuse the same demuxing logic.
 */
export function parseDockerLogs(
  raw: Buffer,
  withTimestamps: boolean,
): ContainerLogLine[] {
  if (!raw || raw.length === 0) return []

  const lines: ContainerLogLine[] = []
  let offset = 0

  while (offset + 8 <= raw.length) {
    const streamType = raw[offset]
    const payloadLength = raw.readUInt32BE(offset + 4)
    offset += 8

    // Incomplete payload — not enough bytes remaining for this chunk.
    if (offset + payloadLength > raw.length) break

    const stream: 'stdout' | 'stderr' =
      streamType === 2 ? 'stderr' : 'stdout'

    const payload = raw.subarray(offset, offset + payloadLength)
    offset += payloadLength

    const text = payload.toString('utf-8')
    for (const line of text.split('\n')) {
      if (line.length === 0) continue

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

      lines.push({ timestamp, stream, message })
    }
  }

  return lines
}
