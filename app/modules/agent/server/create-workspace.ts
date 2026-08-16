import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { createWorkspace } from '../infrastructure/workspace-repository'
import { createMount } from '../infrastructure/workspace-mount-repository'

const createWorkspaceInput = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  containerRegistryId: z.string().uuid().optional(),
  rootPath: z.string().min(1).max(500),
  mounts: z
    .array(
      z.object({
        hostPath: z.string().min(1).max(500),
        containerPath: z.string().min(1).max(500),
        isReadOnly: z.boolean().optional(),
      }),
    )
    .optional(),
})

export const createWorkspaceFn = createServerFn({ method: 'POST' })
  .validator(createWorkspaceInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.CREATE)

    const workspace = await createWorkspace({
      name: data.name,
      projectId: data.projectId,
      environmentId: data.environmentId,
      containerRegistryId: data.containerRegistryId ?? null,
      rootPath: data.rootPath,
      createdById: user.id,
    })

    const mounts: Awaited<ReturnType<typeof createMount>>[] = []
    if (data.mounts && data.mounts.length > 0) {
      for (const mount of data.mounts) {
        const created = await createMount({
          workspaceId: workspace.id,
          hostPath: mount.hostPath,
          containerPath: mount.containerPath,
          isReadOnly: mount.isReadOnly,
        })
        mounts.push(created)
      }
    }

    return { workspace, mounts }
  })
