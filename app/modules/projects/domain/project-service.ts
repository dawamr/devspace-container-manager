import { z } from 'zod'
import {
  findAllProjects,
  findProjectById,
  insertProject,
  updateProject,
  deleteProject,
} from '../infrastructure/project-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
})

export const projectUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
})

export async function listProjectsService() {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.READ)
  return findAllProjects()
}

export async function getProjectService(id: string) {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.READ)
  return findProjectById(id)
}

export async function createProjectService(input: z.infer<typeof projectCreateSchema>) {
  const user = await requirePermission(RESOURCES.PROJECTS, ACTIONS.CREATE)
  return insertProject({
    name: input.name,
    description: input.description ?? null,
    createdById: user.id,
  })
}

export async function updateProjectService(input: z.infer<typeof projectUpdateSchema>) {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.UPDATE)
  return updateProject(input.id, {
    name: input.name,
    description: input.description,
  })
}

export async function deleteProjectService(id: string) {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.DELETE)
  await deleteProject(id)
  return { success: true }
}
