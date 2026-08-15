import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findStackById } from '../infrastructure/stack-registry-repository'
import { findContainersByStack } from '../infrastructure/container-registry-repository'
import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

export interface StackContainerSummary {
  id: string
  containerId: string
  name: string
  image: string
  state: string
  health: ContainerHealth
  status: string
  createdAt: string
  ports: string[]
  isActive: boolean
}

export interface StackDetail {
  id: string
  name: string
  environmentId: string
  projectId: string
  containerCount: number
  isActive: boolean
  type: 'auto' | 'custom'
  color: string | null
  firstSeenAt: string
  lastSeenAt: string
  containers: StackContainerSummary[]
}

/**
 * Get stack detail with container list.
 *
 * Reads from stack_registry + container_registry (DB-backed, fast).
 * Does NOT call Docker Engine — containers come from the registry.
 */
export const getStackDetailFn = createServerFn({ method: 'GET' })
  .validator(z.object({ stackId: z.string().uuid() }))
  .handler(async ({ data }): Promise<StackDetail> => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.READ)

    const stack = await findStackById(data.stackId)
    if (!stack) {
      throw new Error('Stack not found')
    }

    const env = await findEnvironmentById(stack.environmentId)
    if (!env) {
      throw new Error('Environment not found')
    }

    const containers = await findContainersByStack(stack.environmentId, stack.name)

    await captureServerEvent('stack_detail_viewed', {
      stackId: stack.id,
      stackName: stack.name,
      containerCount: containers.length,
    })

    return {
      id: stack.id,
      name: stack.name,
      environmentId: stack.environmentId,
      projectId: stack.projectId,
      containerCount: stack.containerCount,
      isActive: stack.isActive,
      type: (stack.type ?? 'auto') as 'auto' | 'custom',
      color: stack.color ?? null,
      firstSeenAt: stack.firstSeenAt.toISOString(),
      lastSeenAt: stack.lastSeenAt.toISOString(),
      containers: containers.map((c) => ({
        id: c.containerId,
        containerId: c.containerId,
        name: c.name,
        image: c.image,
        state: c.isActive ? 'running' : 'stopped',
        health: (c.health ?? 'none') as ContainerHealth,
        status: c.status ?? '',
        createdAt: c.dockerCreatedAt?.toISOString() ?? c.lastSeenAt.toISOString(),
        ports: (c.ports ?? []) as string[],
        isActive: c.isActive,
      })),
    }
  })
