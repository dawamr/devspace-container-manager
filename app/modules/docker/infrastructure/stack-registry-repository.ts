import { eq, and, inArray } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { stackRegistry } from '#/shared/db/schema'

export type StackRegistryRow = typeof stackRegistry.$inferSelect
export type StackRegistryInsert = typeof stackRegistry.$inferInsert

export async function findByProjectIds(projectIds: string[]): Promise<StackRegistryRow[]> {
  if (projectIds.length === 0) return []
  return db
    .select()
    .from(stackRegistry)
    .where(inArray(stackRegistry.projectId, projectIds))
    .orderBy(stackRegistry.name)
}

export async function findByNameAndEnvironment(
  name: string,
  environmentId: string,
): Promise<StackRegistryRow | null> {
  const rows = await db
    .select()
    .from(stackRegistry)
    .where(
      and(
        eq(stackRegistry.name, name),
        eq(stackRegistry.environmentId, environmentId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function upsertStack(data: StackRegistryInsert): Promise<StackRegistryRow> {
  const [row] = await db
    .insert(stackRegistry)
    .values(data)
    .onConflictDoUpdate({
      target: [stackRegistry.name, stackRegistry.environmentId],
      set: {
        containerCount: data.containerCount,
        lastSeenAt: new Date(),
        isActive: true,
      },
    })
    .returning()
  return row
}

export async function updateContainerCount(id: string, count: number): Promise<void> {
  await db
    .update(stackRegistry)
    .set({ containerCount: count })
    .where(eq(stackRegistry.id, id))
    .execute()
}

export async function findStackById(id: string): Promise<StackRegistryRow | null> {
  const rows = await db
    .select()
    .from(stackRegistry)
    .where(eq(stackRegistry.id, id))
    .limit(1)
  return rows[0] ?? null
}
