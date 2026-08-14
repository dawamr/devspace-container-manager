/**
 * Error handling for Docker Engine API operations.
 *
 * DevSpace talks to Docker Engine exclusively via dockerode from the server.
 * dockerode rejects with a plain `Error` that carries an optional
 * `statusCode` (HTTP status from the Engine API) and possibly a nested
 * `reason`/`json` payload. We normalize every failure into `DockerApiError`
 * so server functions and the UI can branch on `statusCode` / `code`
 * instead of fragile substring matching on the message.
 */

export interface DockerErrorContext {
  /** Logical operation that failed, e.g. "listContainers", "container.start". */
  operation: string
  /** Container/resource id when the failure is resource-specific. */
  resourceId?: string
  /** Docker host the operation targeted (never log secrets/cert paths). */
  host?: string
}

/**
 * Typed wrapper around any Docker Engine failure.
 *
 * `code` is a stable, machine-readable identifier (e.g. NOT_FOUND,
 * CONFLICT, DOCKER_UNREACHABLE, UNKNOWN). Use it for branching and tests;
 * never branch on the human message.
 */
export class DockerApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly operation: string
  public readonly resourceId?: string
  public readonly retryable: boolean
  /** Original error from dockerode, kept for logging/debugging. */
  public readonly cause?: unknown

  constructor(params: {
    message: string
    statusCode: number
    code: string
    operation: string
    resourceId?: string
    retryable?: boolean
    cause?: unknown
  }) {
    super(params.message)
    this.name = 'DockerApiError'
    this.statusCode = params.statusCode
    this.code = params.code
    this.operation = params.operation
    this.resourceId = params.resourceId
    this.retryable = params.retryable ?? false
    this.cause = params.cause
    Object.setPrototypeOf(this, DockerApiError.prototype)
  }
}

/**
 * Docker Engine API error bodies arrive as `{ message: "...", code: "..." }`
 * or sometimes a raw Docker daemon error string. This mirrors the shape we
 * attempt to parse from the rejection.
 */
interface DockerEngineErrorBody {
  message?: string
  code?: string
}

/** Status codes that are worth retrying with backoff. */
const RETRYABLE_STATUS_CODES = new Set<number>([429, 500, 502, 503, 504])

/**
 * Classify a dockerode rejection into a `DockerApiError`.
 *
 * This is the single place that knows how to interpret dockerode's loosely
 * typed errors. All server functions should funnel failures through here
 * (usually via `withDocker`) so error handling stays consistent.
 */
export function classifyDockerError(
  err: unknown,
  ctx: DockerErrorContext,
): DockerApiError {
  if (err instanceof DockerApiError) {
    return err
  }

  const rawMessage = err instanceof Error ? err.message : String(err)
  const statusCode = extractStatusCode(err)
  const engine = extractEngineBody(err)

  // Map well-known Docker Engine conditions to stable codes/messages.
  const lowered = rawMessage.toLowerCase()
  if (
    statusCode === 404 ||
    lowered.includes('no such container') ||
    lowered.includes('not found')
  ) {
    return new DockerApiError({
      message: 'Container tidak ditemukan pada Docker host.',
      statusCode: 404,
      code: 'NOT_FOUND',
      operation: ctx.operation,
      resourceId: ctx.resourceId,
      retryable: false,
      cause: err,
    })
  }

  if (statusCode === 304 || lowered.includes('already')) {
    return new DockerApiError({
      message: 'Container sudah dalam state yang diminta.',
      statusCode: 304,
      code: 'NOT_MODIFIED',
      operation: ctx.operation,
      resourceId: ctx.resourceId,
      retryable: false,
      cause: err,
    })
  }

  if (statusCode === 409 || lowered.includes('conflict')) {
    return new DockerApiError({
      message: 'Operasi container bentrok dengan state saat ini.',
      statusCode: 409,
      code: 'CONFLICT',
      operation: ctx.operation,
      resourceId: ctx.resourceId,
      retryable: false,
      cause: err,
    })
  }

  if (isUnreachable(statusCode, lowered)) {
    return new DockerApiError({
      message: 'Tidak dapat terhubung ke Docker host.',
      statusCode: statusCode || 0,
      code: 'DOCKER_UNREACHABLE',
      operation: ctx.operation,
      resourceId: ctx.resourceId,
      retryable: true,
      cause: err,
    })
  }

  const retryable = statusCode ? RETRYABLE_STATUS_CODES.has(statusCode) : false
  return new DockerApiError({
    message:
      engine?.message ||
      rawMessage ||
      'Terjadi kesalahan saat memanggil Docker Engine.',
    statusCode: statusCode || 0,
    code: engine?.code || 'UNKNOWN',
    operation: ctx.operation,
    resourceId: ctx.resourceId,
    retryable,
    cause: err,
  })
}

/**
 * Convert a `DockerApiError` into a user-facing Indonesian message.
 * Kept separate from the raw message so internal detail never leaks to the UI.
 */
export function userFriendlyDockerMessage(err: unknown): string {
  if (err instanceof DockerApiError) {
    switch (err.code) {
      case 'NOT_FOUND':
        return 'Container tidak ditemukan pada Docker host.'
      case 'NOT_MODIFIED':
        return 'Container sudah dalam state yang diminta.'
      case 'CONFLICT':
        return 'Operasi gagal karena container sedang dalam state lain.'
      case 'DOCKER_UNREACHABLE':
        return 'Gagal terhubung ke Docker host. Periksa koneksi environment.'
      default:
        return 'Terjadi kesalahan pada Docker Engine. Coba beberapa saat lagi.'
    }
  }
  return 'Terjadi kesalahan saat memanggil Docker Engine.'
}

function extractStatusCode(err: unknown): number {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.statusCode === 'number') return e.statusCode
    // dockerode sometimes nests under `reason`
    if (e.reason && typeof e.reason === 'object') {
      const r = e.reason as Record<string, unknown>
      if (typeof r.statusCode === 'number') return r.statusCode
    }
  }
  return 0
}

function extractEngineBody(err: unknown): DockerEngineErrorBody | undefined {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (e.json && typeof e.json === 'object') {
      return e.json as DockerEngineErrorBody
    }
    if (typeof e.message === 'string' && e.message.startsWith('{')) {
      try {
        return JSON.parse(e.message) as DockerEngineErrorBody
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

function isUnreachable(statusCode: number, lowered: string): boolean {
  if (statusCode === 0 && lowered.includes('connect')) return true
  if (statusCode === 0 && lowered.includes('econnrefused')) return true
  if (lowered.includes('docker daemon') && lowered.includes('not running')) {
    return true
  }
  return false
}

/** Stable string used by callers that need the raw message (logging only). */
export function dockerErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
