import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { createSession } from '#/modules/agent/infrastructure/agent-session-repository'
import { getAgentSettings } from '#/modules/agent/infrastructure/settings-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'

const StartSessionInput = z.object({
  workspaceId: z.string().uuid(),
  containerRegistryId: z.string().uuid().optional(),
})

export const startAgentSessionFn = createServerFn({ method: 'POST' })
  .validator(StartSessionInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const config = await getAgentSettings()

    const session = await createSession({
      workspaceId: data.workspaceId,
      userId: user.id,
      containerRegistryId: data.containerRegistryId ?? null,
      status: 'active',
      toolCallCount: 0,
      tokenUsage: 0,
      tokenBudget: config.agentTokenBudget,
    })

    await captureServerEvent('agent_session_started', {
      sessionId: session.id,
      workspaceId: data.workspaceId,
      userId: user.id,
      hasContainer: !!data.containerRegistryId,
    })

    return { sessionId: session.id }
  })
