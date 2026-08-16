import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { getAgentSettings } from '#/modules/agent/infrastructure/settings-repository'

/**
 * Get all agent settings.
 * Secret values (API keys) are masked.
 * Admin-only.
 */
export const getAgentSettingsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requirePermission(RESOURCES.USERS, ACTIONS.READ)
    void user

    const config = await getAgentSettings()

    return {
      llmApiKey: config.llmApiKey ? '••••••••' : '',
      hasApiKey: !!config.llmApiKey,
      llmModel: config.llmModel,
      llmBaseUrl: config.llmBaseUrl,
      agentTokenBudget: config.agentTokenBudget,
      agentToolLimit: config.agentToolLimit,
    }
  },
)
