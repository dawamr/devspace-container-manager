import { eq, and } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { workspaceAssignments, workspaces } from '#/shared/db/schema'

export async function hasWorkspaceAssignment(userId: string, workspaceId: string): Promise<boolean> {
  const result = await db.select({ id: workspaceAssignments.id })
    .from(workspaceAssignments)
    .where(and(
      eq(workspaceAssignments.userId, userId),
      eq(workspaceAssignments.workspaceId, workspaceId),
    ))
    .limit(1)
  return result.length > 0
}

export async function findAssignmentsByUser(userId: string) {
  return db.select({
    assignment: workspaceAssignments,
    workspace: workspaces,
  })
    .from(workspaceAssignments)
    .innerJoin(workspaces, eq(workspaceAssignments.workspaceId, workspaces.id))
    .where(eq(workspaceAssignments.userId, userId))
}

export async function createAssignment(data: {
  workspaceId: string
  userId: string
  role?: string
  assignedBy: string
}) {
  const [assignment] = await db.insert(workspaceAssignments).values({
    workspaceId: data.workspaceId,
    userId: data.userId,
    role: data.role ?? 'developer',
    assignedBy: data.assignedBy,
  }).returning()
  return assignment
}

export async function deleteAssignment(workspaceId: string, userId: string) {
  await db.delete(workspaceAssignments)
    .where(and(
      eq(workspaceAssignments.workspaceId, workspaceId),
      eq(workspaceAssignments.userId, userId),
    ))
}
