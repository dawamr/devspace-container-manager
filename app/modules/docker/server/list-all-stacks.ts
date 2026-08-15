import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findByProjectIds } from '../infrastructure/stack-registry-repository'
import { syncContainerRegistry } from './sync-container-registry'
import { captureServerEvent } from '#/shared/lib/posthog-server'

export interface GlobalStackSummary {
  id: string
  name: string
  containerCount: number
  environmentId: string
  projectId: string
  isActive: boolean
  type: 'auto' | 'custom'
  description: string | null
  color: string | null
  lastSeenAt: string
}

/**
 * List all stacks across all accessible environments (global view).
 *
 * Reads from stack_registry (DB-backed). Triggers async sync.
 */
export const listAllStacksFn = createServerFn({ method: 'GET' })
  .validator(z.object({}).optional())
  .handler(async (): Promise<GlobalStackSummary[]> => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    const rows = await findByProjectIds(projectIds)

    // Fire-and-forget sync
    syncContainerRegistry(projectIds).catch((err) =>
      console.error('[listAllStacks] sync failed:', err),
    )

    await captureServerEvent('stack_list_viewed', {
      source: 'global',
      stackCount: rows.length,
    })

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      containerCount: r.containerCount,
      environmentId: r.environmentId,
      projectId: r.projectId,
      isActive: r.isActive,
      type: (r.type ?? 'auto') as 'auto' | 'custom',
      description: r.description ?? null,
      color: r.color ?? null,
      lastSeenAt: r.lastSeenAt.toISOString(),
    }))
  })
