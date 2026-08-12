import { and, eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { roles, permissions, rolePermissions } from '#/shared/db/schema'

export async function hasPermission(
  roleName: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: rolePermissions.roleId })
    .from(rolePermissions)
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(roles.name, roleName),
        eq(permissions.resource, resource),
        eq(permissions.action, action),
      ),
    )
    .limit(1)
  return rows.length > 0
}
