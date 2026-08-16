import { eq, sql } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { agentSessions } from '#/shared/db/schema'

export async function createSession(data: {
  workspaceId: string
  userId: string
  containerRegistryId: string | null
  status: string
  toolCallCount: number
  tokenUsage: number
  tokenBudget: number
}) {
  const [session] = await db.insert(agentSessions).values({
    workspaceId: data.workspaceId,
    userId: data.userId,
    containerRegistryId: data.containerRegistryId,
    status: data.status,
    toolCallCount: data.toolCallCount,
    tokenUsage: data.tokenUsage,
    tokenBudget: data.tokenBudget,
  }).returning()
  return session
}

export async function findSessionById(id: string) {
  const result = await db.select().from(agentSessions).where(eq(agentSessions.id, id)).limit(1)
  return result[0] ?? null
}

export async function findSessionsByUser(userId: string) {
  return db.select().from(agentSessions).where(eq(agentSessions.userId, userId))
}

export async function updateSession(id: string, data: Partial<{
  status: string
  endedAt: Date | null
  toolCallCount: number
  tokenUsage: number
}>) {
  const [updated] = await db.update(agentSessions)
    .set(data)
    .where(eq(agentSessions.id, id))
    .returning()
  return updated ?? null
}

export async function incrementToolCallCount(id: string) {
  const [updated] = await db.update(agentSessions)
    .set({ toolCallCount: sql`${agentSessions.toolCallCount} + 1` })
    .where(eq(agentSessions.id, id))
    .returning()
  return updated ?? null
}

export async function addTokenUsage(id: string, tokens: number) {
  const [updated] = await db.update(agentSessions)
    .set({ tokenUsage: sql`${agentSessions.tokenUsage} + ${tokens}` })
    .where(eq(agentSessions.id, id))
    .returning()
  return updated ?? null
}

/** Atomically add tokens and return the updated row (for budget checks). */
export async function addTokensAndReturn(id: string, tokens: number) {
  const [updated] = await db.update(agentSessions)
    .set({ tokenUsage: sql`${agentSessions.tokenUsage} + ${tokens}` })
    .where(eq(agentSessions.id, id))
    .returning()
  return updated ?? null
}
