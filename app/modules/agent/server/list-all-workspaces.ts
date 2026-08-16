import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { db } from '#/shared/db/client'
import { workspaces, projects, environments, containerRegistry } from '#/shared/db/schema'

export interface WorkspaceListItem {
  id: string
  name: string
  projectName: string
  environmentName: string
  containerName: string | null
  rootPath: string
  isActive: boolean
}

const listInput = z.object({}).optional()

export const listAllWorkspacesFn = createServerFn({ method: 'GET' })
  .validator(listInput)
  .handler(async () => {
    await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const rows = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        rootPath: workspaces.rootPath,
        isActive: workspaces.isActive,
        projectName: projects.name,
        environmentName: environments.name,
        containerName: containerRegistry.name,
      })
      .from(workspaces)
      .innerJoin(projects, eq(workspaces.projectId, projects.id))
      .innerJoin(environments, eq(workspaces.environmentId, environments.id))
      .leftJoin(containerRegistry, eq(workspaces.containerRegistryId, containerRegistry.id))
      .orderBy(asc(workspaces.name))

    const workspacesList: WorkspaceListItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      projectName: r.projectName,
      environmentName: r.environmentName,
      containerName: r.containerName,
      rootPath: r.rootPath,
      isActive: r.isActive,
    }))

    return { workspaces: workspacesList }
  })
