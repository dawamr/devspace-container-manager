import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { listFilesTool } from '#/modules/agent/tools/list-files'

const ListFilesInput = z.object({
  workspaceId: z.string().uuid(),
  dirPath: z.string().min(1).max(500).default('.'),
})

export const listWorkspaceFilesFn = createServerFn({ method: 'GET' })
  .validator(ListFilesInput)
  .handler(async ({ data }) => {
    const user = await requirePermission(RESOURCES.WORKSPACES, ACTIONS.READ)

    const result = await listFilesTool.execute(
      { userId: user.id, workspaceId: data.workspaceId, containerRegistryId: null },
      { path: data.dirPath },
    )

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to list files')
    }

    return { files: JSON.parse(result.output) }
  })
