import { eq, and, inArray, not } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { containerRegistry } from '#/shared/db/schema'

export type ContainerRegistryRow = typeof containerRegistry.$inferSelect
export type ContainerRegistryInsert = typeof containerRegistry.$inferInsert

export async function findByContainerIdAndEnvironment(
  containerId: string,
  environmentId: string,
): Promise<ContainerRegistryRow | null> {
  const rows = await db
    .select()
    .from(containerRegistry)
    .where(
      and(
        eq(containerRegistry.containerId, containerId),
        eq(containerRegistry.environmentId, environmentId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function findByProjectIds(projectIds: string[]): Promise<ContainerRegistryRow[]> {
  if (projectIds.length === 0) return []
  return db
    .select()
    .from(containerRegistry)
    .where(inArray(containerRegistry.projectId, projectIds))
    .orderBy(containerRegistry.name)
}

export async function findByContainerId(
  containerId: string,
  projectIds: string[],
): Promise<ContainerRegistryRow | null> {
  if (projectIds.length === 0) return null
  const rows = await db
    .select()
    .from(containerRegistry)
    .where(
      and(
        eq(containerRegistry.containerId, containerId),
        inArray(containerRegistry.projectId, projectIds),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function upsertContainer(data: ContainerRegistryInsert): Promise<ContainerRegistryRow> {
  const [row] = await db
    .insert(containerRegistry)
    .values(data)
    .onConflictDoUpdate({
      target: [containerRegistry.containerId, containerRegistry.environmentId],
      set: {
        name: data.name,
        image: data.image,
        stackName: data.stackName,
        lastSeenAt: new Date(),
        isActive: true,
      },
    })
    .returning()
  return row
}

export async function markInactiveNotSeenSince(
  environmentId: string,
  seenContainerIds: string[],
): Promise<void> {
  if (seenContainerIds.length === 0) {
    // All containers gone — mark all in this environment inactive
    await db
      .update(containerRegistry)
      .set({ isActive: false })
      .where(eq(containerRegistry.environmentId, environmentId))
      .execute()
    return
  }

  // Mark containers NOT in the seen list as inactive using NOT IN
  await db
    .update(containerRegistry)
    .set({ isActive: false })
    .where(
      and(
        eq(containerRegistry.environmentId, environmentId),
        not(inArray(containerRegistry.containerId, seenContainerIds)),
      ),
    )
    .execute()
}
