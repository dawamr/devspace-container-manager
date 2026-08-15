import { getCurrentUser } from '#/modules/auth/domain/auth-service'
import { findAllProjects, findProjectsByMemberId } from '../infrastructure/project-repository'
import { ROLE_NAMES } from '#/modules/rbac/domain/constants'

/**
 * Return project IDs the current user can access.
 * Admin: all projects. Developer/Viewer: only member projects.
 */
export async function findAccessibleProjectIds(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  if (user.roleName === ROLE_NAMES.ADMIN) {
    const projects = await findAllProjects()
    return projects.map((p) => p.id)
  }

  const memberships = await findProjectsByMemberId(user.id)
  return memberships.map((m) => m.projectId)
}
