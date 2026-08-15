import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { projects, projectMembers } from '#/shared/db/schema'

export type ProjectRow = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert

export async function findAllProjects() {
  return db.select().from(projects).orderBy(projects.createdAt)
}

export async function findProjectById(id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  return rows[0] ?? null
}

export async function insertProject(data: ProjectInsert) {
  const [row] = await db.insert(projects).values(data).returning()
  return row
}

export async function updateProject(id: string, data: Partial<ProjectInsert>) {
  const [row] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
  return row
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id))
}

export async function findProjectsByMemberId(userId: string) {
  return db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))
}
