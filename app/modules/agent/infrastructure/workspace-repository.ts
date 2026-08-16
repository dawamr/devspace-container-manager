import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { workspaces } from '#/shared/db/schema'

export async function findWorkspaceById(id: string) {
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1)
  return result[0] ?? null
}

export async function findWorkspacesByProject(projectId: string) {
  return db.select().from(workspaces).where(eq(workspaces.projectId, projectId))
}

export async function findWorkspacesByEnvironment(environmentId: string) {
  return db.select().from(workspaces).where(eq(workspaces.environmentId, environmentId))
}

export async function createWorkspace(data: {
  name: string
  projectId: string
  environmentId: string
  containerRegistryId?: string | null
  rootPath: string
  createdById: string
}) {
  const [workspace] = await db.insert(workspaces).values({
    name: data.name,
    projectId: data.projectId,
    environmentId: data.environmentId,
    containerRegistryId: data.containerRegistryId ?? null,
    rootPath: data.rootPath,
    createdById: data.createdById,
  }).returning()
  return workspace
}

export async function updateWorkspace(id: string, data: Partial<{
  name: string
  containerRegistryId: string | null
  rootPath: string
  isActive: boolean
}>) {
  const [updated] = await db.update(workspaces)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(workspaces.id, id))
    .returning()
  return updated ?? null
}

export async function deleteWorkspace(id: string) {
  await db.delete(workspaces).where(eq(workspaces.id, id))
}
