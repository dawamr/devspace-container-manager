import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findSessionById, updateSession } from '#/modules/agent/infrastructure/agent-session-repository'

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

    await updateSession(session.id, { status: 'cancelled', endedAt: new Date() })
    return { success: true }
  })
