/**
 * Generic retry helper with exponential backoff + jitter.
 *
 * Used by Docker Engine calls that are prone to transient failures
 * (daemon temporarily busy, socket reconnect, network blips). It only
 * retries when the thrown error is marked retryable; non-retryable errors
 * (404, 409, auth) fail immediately to avoid masking real problems.
 *
 * Keep this dependency-free so it can be unit-tested in isolation.
 */

export interface RetryOptions {
  /** Maximum attempts (1 = no retry). Default 3. */
  maxAttempts?: number
  /** First backoff in ms. Default 200. */
  baseDelayMs?: number
  /** Backoff multiplier per attempt. Default 2 (exponential). */
  factor?: number
  /** Upper bound for a single backoff in ms. Default 2000. */
  maxDelayMs?: number
  /** Called after each failed attempt (for logging/observability). */
  onAttempt?: (attempt: number, err: unknown) => void
}

export class RetryError extends Error {
  public readonly attempts: number
  public readonly lastError: unknown

  constructor(attempts: number, lastError: unknown) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError)
    super(`Gagal setelah ${attempts} percobaan: ${msg}`)
    this.name = 'RetryError'
    this.attempts = attempts
    this.lastError = lastError
    Object.setPrototypeOf(this, RetryError.prototype)
  }
}

/** Decide whether a thrown error should trigger another attempt. */
export type IsRetryable = (err: unknown) => boolean

const defaultIsRetryable: IsRetryable = (err) =>
  err instanceof Error && (err as { retryable?: boolean }).retryable === true

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nextDelay(attempt: number, opts: Required<RetryOptions>): number {
  const raw = opts.baseDelayMs * Math.pow(opts.factor, attempt - 1)
  const capped = Math.min(raw, opts.maxDelayMs)
  // Full jitter: randomize within [0, capped] to avoid thundering herd.
  return Math.random() * capped
}

/**
 * Run `fn` with retry/backoff. Resolves with the first success.
 * After exhausting attempts, throws `RetryError` wrapping the last failure.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  isRetryable: IsRetryable = defaultIsRetryable,
): Promise<T> {
  const opts: Required<RetryOptions> = {
    maxAttempts: options.maxAttempts ?? 3,
    baseDelayMs: options.baseDelayMs ?? 200,
    factor: options.factor ?? 2,
    maxDelayMs: options.maxDelayMs ?? 2000,
    onAttempt: options.onAttempt ?? (() => {}),
  }

  let lastErr: unknown
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const canRetry = attempt < opts.maxAttempts && isRetryable(err)
      opts.onAttempt(attempt, err)
      if (!canRetry) {
        if (attempt >= opts.maxAttempts) {
          throw new RetryError(attempt, err)
        }
        throw err
      }
      await sleep(nextDelay(attempt, opts))
    }
  }
  // Unreachable, but satisfies TS exhaustiveness.
  throw new RetryError(opts.maxAttempts, lastErr)
}
