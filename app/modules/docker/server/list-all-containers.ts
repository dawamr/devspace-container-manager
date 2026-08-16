import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findByProjectIds, findByIds } from '../infrastructure/container-registry-repository'
import { findAssigneesByContainerIds, findContainerIdsByUserId } from '../infrastructure/container-assignment-repository'
import { syncContainerRegistry } from './sync-container-registry'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

export interface ContainerAssigneeSummary {
  userId: string
  name: string
  role: string
  assignedAt: string
}

export interface GlobalContainerSummary {
  id: string
  registryId: string
  containerId: string
  name: string
  image: string
  state: string
  health: ContainerHealth
  status: string
  createdAt: string
  ports: string[]
  stackName: string | null
  environmentId: string
  projectId: string
  isActive: boolean
  lastSeenAt: string
  assignees: ContainerAssigneeSummary[]
}

/**
 * List all containers across all accessible environments (global view).
 *
 * Reads from container_registry (fast, DB-backed). Triggers an async
 * registry sync (fire-and-forget) so stale entries get refreshed.
 */
export const listAllContainersFn = createServerFn({ method: 'GET' })
  .validator(z.object({}).optional())
  .handler(async (): Promise<GlobalContainerSummary[]> => {
    const user = await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    const projectRows = await findByProjectIds(projectIds)

    // Also fetch containers assigned to the current user, even if they
    // don't have project membership for that container's project.
    // Assignment is metadata — it should surface the container regardless
    // of project-level access.
    const assignedIds = await findContainerIdsByUserId(user.id)
    const assignedRows = await findByIds(assignedIds)

    // Merge: deduplicate by registry PK (id), prioritising project-accessed rows
    const seen = new Set(projectRows.map((r) => r.id))
    const rows = [...projectRows]
    for (const r of assignedRows) {
      if (!seen.has(r.id)) {
        rows.push(r)
        seen.add(r.id)
      }
    }

    // Batch-load assignees for all containers (single query, no N+1)
    const registryIds = rows.map((r) => r.id)
    const assigneeMap = await findAssigneesByContainerIds(registryIds)

    // Fire-and-forget sync — does NOT block response
    syncContainerRegistry(projectIds).catch((err) =>
      console.error('[listAllContainers] sync failed:', err),
    )

    await captureServerEvent('container_list_viewed', {
      source: 'global',
      containerCount: rows.length,
    })

    return rows.map((r) => ({
      id: r.containerId,
      registryId: r.id,
      containerId: r.containerId,
      name: r.name,
      image: r.image,
      state: r.isActive ? 'running' : 'stopped',
      health: (r.health ?? 'none') as ContainerHealth,
      status: r.status ?? '',
      createdAt: r.dockerCreatedAt?.toISOString() ?? r.lastSeenAt.toISOString(),
      ports: (r.ports ?? []) as string[],
      stackName: r.stackName,
      environmentId: r.environmentId,
      projectId: r.projectId,
      isActive: r.isActive,
      lastSeenAt: r.lastSeenAt.toISOString(),
      assignees: (assigneeMap.get(r.id) ?? []).map((a) => ({
        userId: a.userId,
        name: a.name,
        role: a.role,
        assignedAt: a.assignedAt.toISOString(),
      })),
    }))
  })
