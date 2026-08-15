import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { stackRegistry, stackContainerAssignments } from '#/shared/db/schema'

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

export type StackContainerAssignmentRow = typeof stackContainerAssignments.$inferSelect

export async function createCustomStack(data: {
  name: string
  environmentId: string
  projectId: string
  description?: string
  color?: string
}): Promise<StackRegistryRow> {
  const [row] = await db
    .insert(stackRegistry)
    .values({
      ...data,
      type: 'custom',
      containerCount: 0,
      isActive: true,
    })
    .returning()
  return row
}

export async function updateStack(
  id: string,
  data: { name?: string; description?: string; color?: string },
): Promise<StackRegistryRow | null> {
  const [row] = await db
    .update(stackRegistry)
    .set(data)
    .where(eq(stackRegistry.id, id))
    .returning()
  return row ?? null
}

export async function deleteStack(id: string): Promise<void> {
  const stack = await findStackById(id)
  if (stack?.type === 'auto') {
    throw new Error('Cannot delete auto-detected stack')
  }
  await db.delete(stackRegistry).where(eq(stackRegistry.id, id))
}

export async function assignContainerToStack(
  stackId: string,
  containerId: string,
): Promise<void> {
  await db
    .insert(stackContainerAssignments)
    .values({ stackId, containerId })
    .onConflictDoNothing()
}

export async function unassignContainerFromStack(
  stackId: string,
  containerId: string,
): Promise<void> {
  await db
    .delete(stackContainerAssignments)
    .where(
      and(
        eq(stackContainerAssignments.stackId, stackId),
        eq(stackContainerAssignments.containerId, containerId),
      ),
    )
}

export async function findAssignedContainerIds(stackId: string): Promise<string[]> {
  const rows = await db
    .select({ containerId: stackContainerAssignments.containerId })
    .from(stackContainerAssignments)
    .where(eq(stackContainerAssignments.stackId, stackId))
  return rows.map((r) => r.containerId)
}

export async function recomputeStackContainerCount(stackId: string): Promise<void> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stackContainerAssignments)
    .where(eq(stackContainerAssignments.stackId, stackId))
  await db
    .update(stackRegistry)
    .set({ containerCount: result?.count ?? 0 })
    .where(eq(stackRegistry.id, stackId))
}
