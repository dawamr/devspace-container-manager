import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findSessionById, updateSession } from '#/modules/agent/infrastructure/agent-session-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { runAgentLoop } from './run-agent-loop'
import { registerController, unregisterController } from './abort-registry'

const SendMessageInput = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(10000),
})

export const sendAgentMessageFn = createServerFn({ method: 'POST' })
  .validator(SendMessageInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const session = await findSessionById(data.sessionId)
    if (!session) throw new Error('Session not found')
    if (session.userId !== user.id) throw new Error('FORBIDDEN: Session belongs to another user')
    if (session.status !== 'active') throw new Error('Session is not active')

    const events: string[] = []
    const controller = new AbortController()
    registerController(session.id, controller)
    const startedAt = performance.now()

    try {
      await runAgentLoop(
        {
          sessionId: session.id,
          userId: user.id,
          workspaceId: session.workspaceId,
          containerRegistryId: session.containerRegistryId,
          onToken: (token) => events.push(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`),
          onToolCall: (tool, args, result) => events.push(`data: ${JSON.stringify({ type: 'tool_call', tool, args, result })}\n\n`),
          signal: controller.signal,
        },
        data.message,
      )

      await captureServerEvent('agent_session_completed', {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        userId: user.id,
        duration_ms: Math.round(performance.now() - startedAt),
      })
    } catch (err) {
      events.push(`data: ${JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : String(err) })}\n\n`)
      await updateSession(session.id, { status: 'error', endedAt: new Date() })

      await captureServerEvent('agent_session_error', {
        sessionId: session.id,
        workspaceId: session.workspaceId,
        userId: user.id,
        errorMessage: err instanceof Error ? err.message : String(err),
        duration_ms: Math.round(performance.now() - startedAt),
      })
    } finally {
      unregisterController(session.id)
    }

    return { events }
  })
