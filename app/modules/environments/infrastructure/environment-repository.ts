import { eq, inArray } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { environments } from '#/shared/db/schema'

export type EnvironmentRow = typeof environments.$inferSelect
export type EnvironmentInsert = typeof environments.$inferInsert

export async function findEnvironmentsByProjectId(projectId: string) {
  return db
    .select()
    .from(environments)
    .where(eq(environments.projectId, projectId))
    .orderBy(environments.createdAt)
}

export async function findEnvironmentsByProjectIds(projectIds: string[]) {
  if (projectIds.length === 0) return []
  return db
    .select()
    .from(environments)
    .where(inArray(environments.projectId, projectIds))
    .orderBy(environments.createdAt)
}

export async function findEnvironmentById(id: string) {
  const rows = await db
    .select()
    .from(environments)
    .where(eq(environments.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function insertEnvironment(data: EnvironmentInsert) {
  const [row] = await db.insert(environments).values(data).returning()
  return row
}

export async function deleteEnvironment(id: string) {
  await db.delete(environments).where(eq(environments.id, id))
}
