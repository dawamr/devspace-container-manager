import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findByProjectIds } from '../infrastructure/container-registry-repository'
import { syncContainerRegistry } from './sync-container-registry'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

export interface GlobalContainerSummary {
  id: string
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
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    const rows = await findByProjectIds(projectIds)

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
    }))
  })
