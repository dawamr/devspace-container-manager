import { eq, and } from 'drizzle-orm'
import { db } from './client'
import { roles, permissions, rolePermissions, users } from './schema'
import { hashPassword } from '#/shared/lib/crypto'

const RESOURCES = ['users', 'projects', 'environments', 'stacks', 'containers', 'logs', 'workspaces'] as const
const ACTIONS = ['create', 'read', 'update', 'delete', 'assign'] as const

const PERMISSION_MATRIX: Record<string, Record<string, ('create' | 'read' | 'update' | 'delete' | 'assign')[]>> = {
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    environments: ['create', 'read', 'update', 'delete'],
    stacks: ['create', 'read', 'update', 'delete'],
    containers: ['create', 'read', 'update', 'delete', 'assign'],
    logs: ['read'],
    workspaces: ['create', 'read', 'update', 'delete'],
  },
  developer: {
    users: [],
    projects: ['read'],
    environments: ['read'],
    stacks: ['create', 'read', 'update', 'delete'],
    containers: ['create', 'read', 'update', 'delete', 'assign'],
    logs: ['read'],
    workspaces: ['read'],
  },
  viewer: {
    users: [],
    projects: ['read'],
    environments: ['read'],
    stacks: ['read'],
    containers: ['read'],
    logs: ['read'],
    workspaces: ['read'],
  },
}

async function getOrCreateRole(name: string, description: string, isSystem = false) {
  const existing = await db.select().from(roles).where(eq(roles.name, name)).limit(1)
  if (existing[0]) {
    // Update isSystem flag if not set
    if (!existing[0].isSystem && isSystem) {
      await db.update(roles).set({ isSystem }).where(eq(roles.id, existing[0].id))
    }
    return existing[0]
  }
  const [created] = await db
    .insert(roles)
    .values({ name, description, isSystem })
    .onConflictDoNothing()
    .returning()
  return created ?? existing[0]
}

export async function runSeed() {
  console.log('Seeding roles...')
  const adminRole = await getOrCreateRole('admin', 'Full access', true)
  const developerRole = await getOrCreateRole('developer', 'Infrastructure ops, no user admin', true)
  const viewerRole = await getOrCreateRole('viewer', 'Read-only', true)

  if (!adminRole || !developerRole || !viewerRole) {
    throw new Error('Failed to get or create roles')
  }

  console.log('Seeding permissions...')
  const allPerms: { id: string; resource: string; action: string }[] = []
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      // Check if permission already exists
      const existing = await db
        .select()
        .from(permissions)
        .where(and(eq(permissions.resource, resource), eq(permissions.action, action)))
        .limit(1)
      if (existing[0]) {
        allPerms.push(existing[0])
        continue
      }
      const [perm] = await db
        .insert(permissions)
        .values({ resource, action, description: `${action} ${resource}` })
        .onConflictDoNothing()
        .returning()
      if (perm) allPerms.push(perm)
    }
  }

  console.log('Seeding role_permissions...')
  for (const [roleName, matrix] of Object.entries(PERMISSION_MATRIX)) {
    const role = roleName === 'admin' ? adminRole : roleName === 'developer' ? developerRole : viewerRole
    for (const perm of allPerms) {
      if (matrix[perm.resource]?.includes(perm.action as 'create' | 'read' | 'update' | 'delete')) {
        // Check if role_permission already exists
        const existing = await db
          .select()
          .from(rolePermissions)
          .where(and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, perm.id)))
          .limit(1)
        if (existing[0]) continue
        await db
          .insert(rolePermissions)
          .values({ roleId: role.id, permissionId: perm.id })
          .onConflictDoNothing()
      }
    }
  }

  console.log('Seeding admin user...')
  const adminEmail = 'admin@devspace.local'
  const adminPassword = 'DevSpace2026!'
  const existing = await db.select().from(users).where(eq(users.email, adminEmail))
  if (existing.length === 0) {
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      name: 'Admin DevSpace',
      roleId: adminRole.id,
    })
    console.log(`\n  Admin user created:`)
    console.log(`    Email: ${adminEmail}`)
    console.log(`    Password: ${adminPassword}\n`)
  } else {
    console.log('  Admin user already exists, skipping.')
  }

  console.log('Seed complete.')
}
