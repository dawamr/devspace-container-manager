/**
 * In-memory registry of active AbortControllers keyed by session ID.
 * Allows the cancel endpoint to abort a running agent loop.
 * Controllers are cleaned up when the loop completes or errors.
 */
const activeControllers = new Map<string, AbortController>()

export function registerController(sessionId: string, controller: AbortController): void {
  activeControllers.set(sessionId, controller)
}

export function abortSession(sessionId: string): boolean {
  const controller = activeControllers.get(sessionId)
  if (controller) {
    controller.abort()
    activeControllers.delete(sessionId)
    return true
  }
  return false
}

export function unregisterController(sessionId: string): void {
  activeControllers.delete(sessionId)
}
