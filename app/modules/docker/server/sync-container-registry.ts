import { findEnvironmentsByProjectIds } from '#/modules/environments/infrastructure/environment-repository'
import { withDocker } from '../infrastructure/docker-client'
import {
  upsertContainer,
  markInactiveNotSeenSince,
} from '../infrastructure/container-registry-repository'
import {
  upsertStack,
} from '../infrastructure/stack-registry-repository'
import { normalizeHealth, mapPorts } from '../domain/docker-types'

interface SyncResult {
  environmentId: string
  synced: number
  error?: string
}

/**
 * Background reconciliation: fetch live containers from all accessible
 * environments and upsert them into container_registry + stack_registry.
 *
 * This function is fire-and-forget — callers should NOT await it in the
 * request path. It catches errors per environment and continues.
 */
export async function syncContainerRegistry(projectIds: string[]): Promise<SyncResult[]> {
  const environments = await findEnvironmentsByProjectIds(projectIds)
  const results: SyncResult[] = []

  for (const env of environments) {
    try {
      const containers = await withDocker(
        'syncRegistry',
        (docker) => docker.listContainers({ all: true }),
        {
          dockerHost: env.dockerHost,
          dockerCertPath: env.dockerCertPath,
        },
      )

      const seenContainerIds: string[] = []
      const stackCounts = new Map<string, number>()

      for (const c of containers) {
        seenContainerIds.push(c.Id)

        await upsertContainer({
          containerId: c.Id,
          name: (c.Names?.[0] ?? '').replace(/^\//, ''),
          image: c.Image,
          environmentId: env.id,
          projectId: env.projectId,
          stackName: c.Labels?.['com.docker.compose.project'] ?? null,
          status: c.Status,
          health: normalizeHealth(c.Status ?? ''),
          ports: mapPorts(c.Ports),
          dockerCreatedAt: new Date(c.Created * 1000),
          isActive: true,
        })

        const stackName = c.Labels?.['com.docker.compose.project']
        if (stackName) {
          stackCounts.set(stackName, (stackCounts.get(stackName) ?? 0) + 1)
        }
      }

      // Upsert stacks
      for (const [stackName, count] of stackCounts) {
        await upsertStack({
          name: stackName,
          environmentId: env.id,
          projectId: env.projectId,
          containerCount: count,
          isActive: true,
        })
      }

      // Mark containers not seen as inactive
      await markInactiveNotSeenSince(env.id, seenContainerIds)

      results.push({ environmentId: env.id, synced: containers.length })
    } catch (err) {
      console.error(`[sync] Failed to sync environment ${env.id}:`, err)
      results.push({
        environmentId: env.id,
        synced: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}
