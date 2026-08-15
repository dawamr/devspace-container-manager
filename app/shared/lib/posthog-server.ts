import type { PostHog } from 'posthog-node'

let client: PostHog | null | undefined

/**
 * Lazily construct a server-side PostHog client (posthog-node).
 *
 * Reads `POSTHOG_SERVER_KEY` from the server environment. If unset, tracking is
 * a no-op (returns null) so the application never fails because analytics is
 * unconfigured. The client is created at most once per process.
 *
 * `posthog-node` is imported dynamically so the module is only loaded when we
 * actually track — keeps it out of the client bundle and avoids init cost when
 * analytics is disabled.
 */
async function getClient(): Promise<PostHog | null> {
  if (client !== undefined) return client

  const key = process.env.POSTHOG_SERVER_KEY
  if (!key) {
    client = null
    return client
  }

  const { PostHog } = await import('posthog-node')
  client = new PostHog(key, {
    host: process.env.POSTHOG_SERVER_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  return client
}

/**
 * Capture a server-side event. Fire-and-forget: never blocks the request
 * path. Errors are swallowed (analytics must not break a Docker operation).
 */
export async function captureServerEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const ph = await getClient()
    if (!ph) return
    ph.capture({ event, properties })
  } catch {
    // analytics failure must not surface to callers
  }
}

/**
 * Flush pending events. Call on process shutdown; safe to call anytime.
 */
export async function flushPostHog(): Promise<void> {
  const ph = await getClient()
  if (!ph) return
  try {
    await ph.shutdown()
  } catch {
    // ignore
  }
}
