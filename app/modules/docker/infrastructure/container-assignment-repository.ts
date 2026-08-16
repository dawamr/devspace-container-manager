import { eq, and, inArray } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { containerAssignments, users } from '#/shared/db/schema'

export type ContainerAssignmentRow = typeof containerAssignments.$inferSelect
export type ContainerAssignmentInsert = typeof containerAssignments.$inferInsert

/** Assignee with user details (for display). */
export interface AssigneeWithUser {
  id: string
  containerRegistryId: string
  userId: string
  name: string
  email: string
  role: string
  assignedBy: string
  assignedAt: Date
}

/** Upsert a single user-to-container assignment (updates role if already exists). */
export async function upsertAssignment(data: {
  containerRegistryId: string
  userId: string
  role: string
  assignedBy: string
}): Promise<ContainerAssignmentRow> {
  const [row] = await db
    .insert(containerAssignments)
    .values({
      containerRegistryId: data.containerRegistryId,
      userId: data.userId,
      role: data.role,
      assignedBy: data.assignedBy,
    })
    .onConflictDoUpdate({
      target: [containerAssignments.containerRegistryId, containerAssignments.userId],
      set: {
        role: data.role,
        assignedBy: data.assignedBy,
        assignedAt: new Date(),
      },
    })
    .returning()
  return row
}

/** Remove a single assignment. */
export async function removeAssignment(
  containerRegistryId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(containerAssignments)
    .where(
      and(
        eq(containerAssignments.containerRegistryId, containerRegistryId),
        eq(containerAssignments.userId, userId),
      ),
    )
    .execute()
}

/** Get all assignees for a container, joined with user details. */
export async function findAssigneesByContainerId(
  containerRegistryId: string,
): Promise<AssigneeWithUser[]> {
  const rows = await db
    .select({
      id: containerAssignments.id,
      containerRegistryId: containerAssignments.containerRegistryId,
      userId: containerAssignments.userId,
      name: users.name,
      email: users.email,
      role: containerAssignments.role,
      assignedBy: containerAssignments.assignedBy,
      assignedAt: containerAssignments.assignedAt,
    })
    .from(containerAssignments)
    .innerJoin(users, eq(containerAssignments.userId, users.id))
    .where(eq(containerAssignments.containerRegistryId, containerRegistryId))
    .orderBy(containerAssignments.assignedAt)
  return rows
}

/** Batch query: get assignees for multiple containers at once (avoids N+1). */
export async function findAssigneesByContainerIds(
  containerRegistryIds: string[],
): Promise<Map<string, AssigneeWithUser[]>> {
  const result = new Map<string, AssigneeWithUser[]>()

  if (containerRegistryIds.length === 0) return result

  const rows = await db
    .select({
      id: containerAssignments.id,
      containerRegistryId: containerAssignments.containerRegistryId,
      userId: containerAssignments.userId,
      name: users.name,
      email: users.email,
      role: containerAssignments.role,
      assignedBy: containerAssignments.assignedBy,
      assignedAt: containerAssignments.assignedAt,
    })
    .from(containerAssignments)
    .innerJoin(users, eq(containerAssignments.userId, users.id))
    .where(inArray(containerAssignments.containerRegistryId, containerRegistryIds))
    .orderBy(containerAssignments.containerRegistryId, containerAssignments.assignedAt)

  for (const row of rows) {
    const existing = result.get(row.containerRegistryId) ?? []
    existing.push(row)
    result.set(row.containerRegistryId, existing)
  }

  return result
}

/** Get all container registry IDs assigned to a user. */
export async function findContainerIdsByUserId(
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ containerRegistryId: containerAssignments.containerRegistryId })
    .from(containerAssignments)
    .where(eq(containerAssignments.userId, userId))
  return rows.map((r) => r.containerRegistryId)
}

/** Bulk assign multiple users to a container with per-user roles (upsert each). */
export async function bulkUpsertAssignments(data: {
  containerRegistryId: string
  assignments: Array<{ userId: string; role: string }>
  assignedBy: string
}): Promise<ContainerAssignmentRow[]> {
  const results: ContainerAssignmentRow[] = []
  for (const item of data.assignments) {
    const row = await upsertAssignment({
      containerRegistryId: data.containerRegistryId,
      userId: item.userId,
      role: item.role,
      assignedBy: data.assignedBy,
    })
    results.push(row)
  }
  return results
}

/** Remove all assignments for a container (used on container deletion). */
export async function removeAllAssignments(
  containerRegistryId: string,
): Promise<void> {
  await db
    .delete(containerAssignments)
    .where(eq(containerAssignments.containerRegistryId, containerRegistryId))
    .execute()
}
