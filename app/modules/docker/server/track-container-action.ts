import type Docker from 'dockerode'

import { withDocker } from '../infrastructure/docker-client'
import { DockerApiError } from '../domain/docker-error'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

export type ContainerAction = 'start' | 'stop' | 'restart' | 'remove'

interface RunContainerActionTrackedParams {
  environment: { dockerHost: string; dockerCertPath?: string | null }
  environmentId: string
  containerId: string
  action: ContainerAction
  /** Optional name lookup (for analytics) performed inside the same Docker call. */
  getName?: (docker: Docker) => Promise<string | undefined>
  /** The actual Docker Engine operation. */
  run: (docker: Docker) => Promise<void>
}

/**
 * Run a container action through `withDocker` and emit a PostHog event for
 * both the success and failure paths.
 *
 * - Success (and idempotent 304 NOT_MODIFIED) → `container_<action>_success`
 *   with `duration_ms` (integer ms, request-scoped).
 * - Failure → `container_<action>_failed` with `errorMessage`.
 *
 * `dockerHost` is always redacted before it leaves the server. Tracking is
 * fire-and-forget: analytics failures never break the Docker operation.
 */
export async function runContainerActionTracked(
  params: RunContainerActionTrackedParams,
): Promise<void> {
  const { environment, environmentId, containerId, action } = params
  const startedAt = performance.now()
  let containerName: string | undefined

  const eventBase = {
    environmentId,
    containerId,
    containerName,
    dockerHost: redactDockerHost(environment.dockerHost),
  }

  try {
    await withDocker(
      `container.${action}`,
      async (docker) => {
        if (params.getName) {
          containerName = await params.getName(docker)
        }
        await params.run(docker)
      },
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: containerId,
      },
    )

    await captureServerEvent(`container_${action}_success`, {
      ...eventBase,
      containerName,
      duration_ms: Math.round(performance.now() - startedAt),
    })
  } catch (err) {
    // 304 NOT_MODIFIED = already in the desired state (already running /
    // already stopped). Treat as a successful, idempotent operation.
    if (err instanceof DockerApiError && err.statusCode === 304) {
      await captureServerEvent(`container_${action}_success`, {
        ...eventBase,
        containerName,
        duration_ms: Math.round(performance.now() - startedAt),
      })
      return
    }

    const message = err instanceof Error ? err.message : String(err)
    await captureServerEvent(`container_${action}_failed`, {
      ...eventBase,
      containerName,
      errorMessage: message,
    })
    throw err
  }
}
