import { eq, asc, count } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { roles, permissions, rolePermissions, users } from '#/shared/db/schema'

export type RoleWithStats = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  permissionCount: number
  userCount: number
}

export type PermissionItem = {
  id: string
  resource: string
  action: string
  description: string | null
}

export async function listRoles(): Promise<RoleWithStats[]> {
  const roleRows = await db.select().from(roles).orderBy(asc(roles.name))

  const result: RoleWithStats[] = []
  for (const role of roleRows) {
    const [permCount] = await db
      .select({ count: count() })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id))
    const [userCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.roleId, role.id))
    result.push({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissionCount: permCount?.count ?? 0,
      userCount: userCount?.count ?? 0,
    })
  }
  return result
}

export async function findRoleById(id: string) {
  const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
  return rows[0] ?? null
}

export async function findRoleByName(name: string) {
  const rows = await db.select().from(roles).where(eq(roles.name, name)).limit(1)
  return rows[0] ?? null
}

export async function createRole(name: string, description: string | null) {
  const [created] = await db
    .insert(roles)
    .values({ name, description })
    .returning()
  if (!created) throw new Error('Failed to create role')
  return created
}

export async function updateRole(id: string, updates: { name?: string; description?: string | null }) {
  const setValues: Record<string, unknown> = { updatedAt: new Date() }
  if (updates.name !== undefined) setValues.name = updates.name
  if (updates.description !== undefined) setValues.description = updates.description
  await db.update(roles).set(setValues).where(eq(roles.id, id))
}

export async function deleteRole(id: string) {
  await db.delete(roles).where(eq(roles.id, id))
}

export async function listAllPermissions(): Promise<PermissionItem[]> {
  return await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
    })
    .from(permissions)
    .orderBy(asc(permissions.resource), asc(permissions.action))
}

export async function getRolePermissionIds(roleId: string): Promise<string[]> {
  const rows = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId))
  return rows.map((r) => r.permissionId)
}

export async function replaceRolePermissions(roleId: string, permissionIds: string[]) {
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    if (permissionIds.length > 0) {
      await tx.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({ roleId, permissionId })),
      )
    }
  })
}

export async function countUsersByRole(roleId: string): Promise<number> {
  const [result] = await db.select({ count: count() }).from(users).where(eq(users.roleId, roleId))
  return result?.count ?? 0
}
