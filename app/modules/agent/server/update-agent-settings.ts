import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { upsertSettings } from '#/modules/agent/infrastructure/settings-repository'

const UpdateAgentSettingsInput = z.object({
  llmApiKey: z.string().optional(),
  llmModel: z.string().min(1).max(100),
  llmBaseUrl: z.string().max(500),
  agentTokenBudget: z.number().int().min(1000).max(1000000),
  agentToolLimit: z.number().int().min(1).max(500),
})

/**
 * Update agent settings. Admin-only.
 * API key is only updated if provided and not the mask placeholder.
 */
export const updateAgentSettingsFn = createServerFn({ method: 'POST' })
  .validator(UpdateAgentSettingsInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.USERS, ACTIONS.UPDATE)

    const entries: Array<{ key: string; value: string }> = [
      { key: 'llm_model', value: data.llmModel },
      { key: 'llm_base_url', value: data.llmBaseUrl },
      { key: 'agent_token_budget', value: String(data.agentTokenBudget) },
      { key: 'agent_tool_limit', value: String(data.agentToolLimit) },
    ]

    // Only update API key if it's a real value (not the mask placeholder)
    if (data.llmApiKey && data.llmApiKey !== '••••••••') {
      entries.push({ key: 'llm_api_key', value: data.llmApiKey })
    }

    await upsertSettings(entries, user.id)

    return { success: true }
  })
