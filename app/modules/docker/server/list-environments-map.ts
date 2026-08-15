import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { inArray } from 'drizzle-orm'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findEnvironmentsByProjectIds } from '#/modules/environments/infrastructure/environment-repository'
import { db } from '#/shared/db/client'
import { projects as projectsTable } from '#/shared/db/schema'

export interface EnvironmentMapEntry {
  environmentId: string
  environmentName: string
  projectId: string
  projectName: string
}

export const listEnvironmentsMapFn = createServerFn({ method: 'GET' })
  .validator(z.object({}).optional())
  .handler(async (): Promise<EnvironmentMapEntry[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    if (projectIds.length === 0) return []

    const environments = await findEnvironmentsByProjectIds(projectIds)
    if (environments.length === 0) return []

    const uniqueProjectIds = [...new Set(environments.map((e) => e.projectId))]
    const projects = await db
      .select({ id: projectsTable.id, name: projectsTable.name })
      .from(projectsTable)
      .where(inArray(projectsTable.id, uniqueProjectIds))

    const projectMap = new Map(projects.map((p) => [p.id, p.name]))

    return environments.map((e) => ({
      environmentId: e.id,
      environmentName: e.name,
      projectId: e.projectId,
      projectName: projectMap.get(e.projectId) ?? 'Unknown',
    }))
  })
