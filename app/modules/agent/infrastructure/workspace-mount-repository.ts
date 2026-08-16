import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { workspaceMounts } from '#/shared/db/schema'

export async function findMountsByWorkspace(workspaceId: string) {
  return db.select().from(workspaceMounts).where(eq(workspaceMounts.workspaceId, workspaceId))
}

export async function createMount(data: {
  workspaceId: string
  hostPath: string
  containerPath: string
  isReadOnly?: boolean
}) {
  const [mount] = await db.insert(workspaceMounts).values({
    workspaceId: data.workspaceId,
    hostPath: data.hostPath,
    containerPath: data.containerPath,
    isReadOnly: data.isReadOnly ?? false,
  }).returning()
  return mount
}

export async function deleteMountsByWorkspace(workspaceId: string) {
  await db.delete(workspaceMounts).where(eq(workspaceMounts.workspaceId, workspaceId))
}
