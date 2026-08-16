import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { settings } from '#/shared/db/schema'

/**
 * Get a single setting value by key.
 * Returns null if not found.
 */
export async function getSetting(key: string): Promise<string | null> {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
  return result[0]?.value ?? null
}

/**
 * Get all settings in a category.
 */
export async function getSettingsByCategory(category: string): Promise<
  Array<{ key: string; value: string; isSecret: boolean }>
> {
  return db
    .select({
      key: settings.key,
      value: settings.value,
      isSecret: settings.isSecret,
    })
    .from(settings)
    .where(eq(settings.category, category))
}

/**
 * Get all agent settings as a typed object.
 * Falls back to env vars if DB value is empty.
 */
export async function getAgentSettings(): Promise<{
  llmApiKey: string
  llmModel: string
  llmBaseUrl: string
  agentTokenBudget: number
  agentToolLimit: number
}> {
  const rows = await getSettingsByCategory('agent')
  const map = new Map(rows.map((r) => [r.key, r.value]))

  // Fall back to env vars if DB value is empty
  return {
    llmApiKey: map.get('llm_api_key') || process.env.LLM_API_KEY || '',
    llmModel: map.get('llm_model') || process.env.LLM_MODEL || 'gpt-4o',
    llmBaseUrl: map.get('llm_base_url') || process.env.LLM_BASE_URL || '',
    agentTokenBudget: Number(map.get('agent_token_budget') || process.env.AGENT_TOKEN_BUDGET || 50000),
    agentToolLimit: Number(map.get('agent_tool_limit') || process.env.AGENT_TOOL_LIMIT || 50),
  }
}

/**
 * Upsert a setting.
 */
export async function upsertSetting(
  key: string,
  value: string,
  updatedBy?: string,
): Promise<void> {
  await db
    .insert(settings)
    .values({
      key,
      value,
      updatedBy: updatedBy ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
}

/**
 * Upsert multiple settings in a batch.
 */
export async function upsertSettings(
  entries: Array<{ key: string; value: string }>,
  updatedBy?: string,
): Promise<void> {
  for (const { key, value } of entries) {
    await upsertSetting(key, value, updatedBy)
  }
}
