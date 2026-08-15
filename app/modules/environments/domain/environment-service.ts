import { z } from 'zod'
import {
  findEnvironmentsByProjectId,
  findEnvironmentById,
  insertEnvironment,
  deleteEnvironment,
} from '../infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'

export const environmentCreateSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  dockerHost: z.string().min(1).max(255),
  dockerCertPath: z.string().max(255).optional().nullable(),
  tlsEnabled: z.boolean().default(false),
})

export async function listEnvironmentsService(projectId: string) {
  await requirePermission(RESOURCES.ENVIRONMENTS, ACTIONS.READ)
  return findEnvironmentsByProjectId(projectId)
}

export async function getEnvironmentService(id: string) {
  await requirePermission(RESOURCES.ENVIRONMENTS, ACTIONS.READ)
  return findEnvironmentById(id)
}

export async function createEnvironmentService(
  input: z.infer<typeof environmentCreateSchema>,
) {
  await requirePermission(RESOURCES.ENVIRONMENTS, ACTIONS.CREATE)
  return insertEnvironment({
    projectId: input.projectId,
    name: input.name,
    dockerHost: input.dockerHost,
    dockerCertPath: input.dockerCertPath ?? null,
    tlsEnabled: input.tlsEnabled,
  })
}

export async function deleteEnvironmentService(id: string) {
  await requirePermission(RESOURCES.ENVIRONMENTS, ACTIONS.DELETE)
  await deleteEnvironment(id)
  return { success: true }
}
