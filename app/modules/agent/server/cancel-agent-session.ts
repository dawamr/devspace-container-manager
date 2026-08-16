import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findSessionById, updateSession } from '#/modules/agent/infrastructure/agent-session-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { abortSession } from './abort-registry'

const CancelSessionInput = z.object({
  sessionId: z.string().uuid(),
})

export const cancelAgentSessionFn = createServerFn({ method: 'POST' })
  .validator(CancelSessionInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const session = await findSessionById(data.sessionId)
    if (!session) throw new Error('Session not found')
    if (session.userId !== user.id) throw new Error('FORBIDDEN: Session belongs to another user')

    const aborted = abortSession(data.sessionId)
    await updateSession(session.id, { status: 'cancelled', endedAt: new Date() })

    await captureServerEvent('agent_session_cancelled', {
      sessionId: session.id,
      workspaceId: session.workspaceId,
      userId: user.id,
    })

    return { success: true, aborted }
  })
