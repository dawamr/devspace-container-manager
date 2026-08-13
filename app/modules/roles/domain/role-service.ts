import { z } from 'zod'
import {
  listRoles,
  findRoleById,
  findRoleByName,
  createRole,
  updateRole,
  deleteRole,
  listAllPermissions,
  getRolePermissionIds,
  replaceRolePermissions,
  countUsersByRole,
} from '../infrastructure/role-repository'

export const createRoleSchema = z.object({
  name: z.string().min(3, 'Nama role minimal 3 karakter').max(50).regex(/^[a-z0-9_-]+$/, 'Hanya huruf kecil, angka, -, _'),
  description: z.string().max(200).optional(),
})

export const updateRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/).optional(),
  description: z.string().max(200).nullable().optional(),
})

export const updateRolePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
})

export async function getRoles() {
  return listRoles()
}

export async function getPermissions() {
  return listAllPermissions()
}

export async function getRolePermissions(roleId: string) {
  return getRolePermissionIds(roleId)
}

export async function createNewRole(name: string, description?: string) {
  const existing = await findRoleByName(name)
  if (existing) throw new Error('Nama role sudah digunakan')
  return createRole(name, description ?? null)
}

export async function updateExistingRole(id: string, updates: { name?: string; description?: string | null }) {
  const role = await findRoleById(id)
  if (!role) throw new Error('NOT_FOUND')
  if (role.isSystem && updates.name && updates.name !== role.name) {
    throw new Error('System role tidak bisa diubah namanya')
  }
  if (updates.name && updates.name !== role.name) {
    const existing = await findRoleByName(updates.name)
    if (existing) throw new Error('Nama role sudah digunakan')
  }
  await updateRole(id, updates)
}

export async function deleteExistingRole(id: string) {
  const role = await findRoleById(id)
  if (!role) throw new Error('NOT_FOUND')
  if (role.isSystem) {
    throw new Error('System role tidak bisa dihapus')
  }
  const userCount = await countUsersByRole(id)
  if (userCount > 0) {
    throw new Error(`Role masih digunakan oleh ${userCount} user`)
  }
  await deleteRole(id)
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]) {
  const role = await findRoleById(roleId)
  if (!role) throw new Error('NOT_FOUND')
  await replaceRolePermissions(roleId, permissionIds)
}
