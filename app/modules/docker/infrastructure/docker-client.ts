import Docker from 'dockerode'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DockerInfo } from '#/modules/docker/domain/docker-types'
import {
  classifyDockerError,
  userFriendlyDockerMessage,
  DockerApiError,
  type DockerErrorContext,
} from '#/modules/docker/domain/docker-error'
import { withRetry } from './with-retry'

export interface DockerConnectionTestResult {
  success: boolean
  info?: DockerInfo
  error?: string
}

/**
 * Build a dockerode client for a given Docker host.
 *
 * Factory (not singleton): callers own instance lifecycle and caching so the
 * same Environment can be re-resolved without global mutable state. This is
 * required for multi-host support — each Environment carries its own
 * dockerHost + dockerCertPath.
 *
 * @param dockerHost  e.g. "unix:///var/run/docker.sock" or "tcp://host:2376"
 * @param dockerCertPath  optional directory holding ca.pem / cert.pem / key.pem
 */
export function createDockerClient(
  dockerHost: string,
  dockerCertPath?: string | null,
): Docker {
  const options = parseDockerHost(dockerHost)

  if (dockerCertPath) {
    options.ca = readFileSync(join(dockerCertPath, 'ca.pem'))
    options.cert = readFileSync(join(dockerCertPath, 'cert.pem'))
    options.key = readFileSync(join(dockerCertPath, 'key.pem'))
  }

  return new Docker(options)
}

/**
 * Verify reachability of a Docker host.
 * Uses `docker.ping()` for the liveness check and enriches the result with
 * `docker.info()` when available. Never throws — failures are classified and
 * returned as `{ success: false, error }` with a user-friendly message.
 */
export async function testDockerConnection(
  dockerHost: string,
  dockerCertPath?: string | null,
): Promise<DockerConnectionTestResult> {
  const docker = createDockerClient(dockerHost, dockerCertPath)

  try {
    await withRetry(() => docker.ping(), {
      maxAttempts: 2,
      baseDelayMs: 150,
      onAttempt: (a, err) =>
        console.warn(`[docker] ping attempt ${a} failed:`, err),
    })
  } catch (err) {
    const classified = classifyDockerError(err, { operation: 'ping', host: dockerHost })
    return { success: false, error: userFriendlyDockerMessage(classified) }
  }

  let info: DockerInfo | undefined
  try {
    info = (await docker.info()) as DockerInfo
  } catch {
    // ping succeeded; info is optional enrichment
  }

  return { success: true, info }
}

/**
 * Execute a dockerode operation with centralized error handling + retry.
 *
 * - Classifies every dockerode rejection into a typed `DockerApiError`.
 * - Retries transient (retryable) failures with exponential backoff.
 * - Returns a plain `Promise<T>`; callers `await` and catch `DockerApiError`
 *   to surface a stable code + user-friendly message.
 *
 * @param operation  logical name, used for error context + logs
 * @param fn         the dockerode call (receives the connected client)
 * @param ctx        extra context (resourceId, host)
 */
export async function withDocker<T>(
  operation: string,
  fn: (docker: Docker) => Promise<T>,
  ctx: Omit<DockerErrorContext, 'operation'> & {
    dockerHost: string
    dockerCertPath?: string | null
  },
  retryOptions?: Parameters<typeof withRetry>[1],
): Promise<T> {
  const docker = createDockerClient(ctx.dockerHost, ctx.dockerCertPath)
  const errorCtx: DockerErrorContext = {
    operation,
    resourceId: ctx.resourceId,
    host: ctx.dockerHost,
  }

  // Classify first so retry decisions use the typed `retryable` flag, then
  // rethrow the classified DockerApiError (which carries retryable state).
  const runOnce = async (): Promise<T> => {
    try {
      return await fn(docker)
    } catch (err) {
      throw classifyDockerError(err, errorCtx)
    }
  }

  // Retry only when the thrown DockerApiError is marked retryable.
  const isRetryable = (err: unknown): boolean =>
    err instanceof DockerApiError && err.retryable

  try {
    return await withRetry(runOnce, retryOptions, isRetryable)
  } catch (err) {
    // Reclassify to guarantee a DockerApiError (covers RetryError wrap).
    throw classifyDockerError(err, errorCtx)
  }
}

function parseDockerHost(dockerHost: string): Docker.DockerOptions {
  const trimmed = dockerHost.trim()

  if (trimmed.startsWith('unix://')) {
    return { socketPath: trimmed.slice('unix://'.length) }
  }

  if (trimmed.startsWith('tcp://')) {
    const [host, portStr] = trimmed.slice('tcp://'.length).split(':')
    return { host, port: portStr ? Number(portStr) : 2375 }
  }

  // Fallback: bare "host:port" or a raw socket path.
  if (trimmed.includes(':')) {
    const [host, portStr] = trimmed.split(':')
    return { host, port: Number(portStr) }
  }

  return { socketPath: trimmed }
}
