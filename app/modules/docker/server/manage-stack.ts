import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import {
  createCustomStack,
  updateStack,
  deleteStack,
  assignContainerToStack,
  unassignContainerFromStack,
  recomputeStackContainerCount,
} from '../infrastructure/stack-registry-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'

export const createCustomStackFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(1).max(255),
      environmentId: z.string().uuid(),
      projectId: z.string().uuid(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.CREATE)
    const stack = await createCustomStack(data)
    await captureServerEvent('stack_created', {
      stackId: stack.id,
      stackName: stack.name,
      type: 'custom',
    })
    return { id: stack.id, name: stack.name }
  })

export const updateStackFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    const stack = await updateStack(data.stackId, {
      name: data.name,
      description: data.description,
      color: data.color,
    })
    if (stack) {
      await captureServerEvent('stack_updated', { stackId: stack.id })
    }
    return stack ? { id: stack.id } : null
  })

export const deleteStackFn = createServerFn({ method: 'POST' })
  .validator(z.object({ stackId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.DELETE)
    await deleteStack(data.stackId)
    await captureServerEvent('stack_deleted', { stackId: data.stackId })
    return { success: true }
  })

export const assignContainerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      containerId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    await assignContainerToStack(data.stackId, data.containerId)
    await recomputeStackContainerCount(data.stackId)
    await captureServerEvent('container_assigned_to_stack', {
      stackId: data.stackId,
      containerId: data.containerId,
    })
    return { success: true }
  })

export const unassignContainerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      containerId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    await unassignContainerFromStack(data.stackId, data.containerId)
    await recomputeStackContainerCount(data.stackId)
    await captureServerEvent('container_unassigned_from_stack', {
      stackId: data.stackId,
      containerId: data.containerId,
    })
    return { success: true }
  })
