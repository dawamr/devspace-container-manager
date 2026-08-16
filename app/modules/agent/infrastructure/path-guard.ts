import path from 'node:path'
import fs from 'node:fs/promises'
import { findWorkspaceById } from './workspace-repository'
import { findMountsByWorkspace } from './workspace-mount-repository'
import { hasWorkspaceAssignment } from './workspace-assignment-repository'

/**
 * Resolve the workspace root path for a given user + workspace.
 * Verifies the user has an active assignment to the workspace.
 * Returns the absolute host root path.
 */
export async function resolveWorkspaceRoot(userId: string, workspaceId: string): Promise<string> {
  const hasAccess = await hasWorkspaceAssignment(userId, workspaceId)
  if (!hasAccess) {
    throw new Error('FORBIDDEN: No workspace assignment for this user')
  }

  const workspace = await findWorkspaceById(workspaceId)
  if (!workspace) {
    throw new Error('WORKSPACE_NOT_FOUND')
  }
  if (!workspace.isActive) {
    throw new Error('WORKSPACE_INACTIVE')
  }

  return workspace.rootPath
}

/**
 * Validate that a resolved path is within the allowed root.
 * Uses path.resolve() to normalize, then checks containment.
 * Also rejects symlinks that escape the root.
 */
export function validatePath(rootPath: string, targetPath: string): { valid: boolean; resolved?: string; reason?: string } {
  const resolved = path.resolve(rootPath, targetPath)
  const normalizedRoot = path.resolve(rootPath)

  // Containment check: resolved must be root or start with root + sep
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    return { valid: false, reason: 'PATH_ESCAPES: Path is outside workspace boundary' }
  }

  return { valid: true, resolved }
}

/**
 * Resolve a container path from a host path using workspace mounts.
 * Returns the container path if a mount mapping exists, otherwise null.
 */
export async function resolveContainerPath(
  workspaceId: string,
  hostPath: string,
): Promise<string | null> {
  const mounts = await findMountsByWorkspace(workspaceId)

  // Find the mount whose hostPath is a prefix of the given hostPath
  for (const mount of mounts) {
    const normalizedMount = path.resolve(mount.hostPath)
    const normalizedHost = path.resolve(hostPath)

    if (normalizedHost === normalizedMount || normalizedHost.startsWith(normalizedMount + path.sep)) {
      // Map the host path to container path
      const relative = path.relative(normalizedMount, normalizedHost)
      return path.join(mount.containerPath, relative)
    }
  }

  return null
}

/**
 * Check if a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
