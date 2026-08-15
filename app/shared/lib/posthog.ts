import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,
    person_profiles: 'identified_only',
  })
  initialized = true
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, properties)
}

/**
 * Redact a Docker host string so it is never fully exposed in analytics.
 *
 * - `unix://...` → "local" (no filesystem path leaked)
 * - `tcp://host:2376` / `host:port` → host only, port stripped
 * - empty / unknown → "unknown"
 *
 * The port (and any embedded credentials) are intentionally dropped.
 */
export function redactDockerHost(dockerHost: string | null | undefined): string {
  if (!dockerHost) return 'unknown'

  const trimmed = dockerHost.trim()

  if (trimmed.startsWith('unix://')) return 'local'
  if (trimmed.startsWith('local://')) return 'local'

  if (trimmed.startsWith('tcp://')) {
    const host = trimmed.slice('tcp://'.length).split(':')[0]
    return host || 'unknown'
  }

  // bare "host:port" or raw host
  const host = trimmed.split(':')[0]
  return host || 'unknown'
}
