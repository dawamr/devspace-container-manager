import { eq } from 'drizzle-orm'
import { db } from './client'
import { roles, permissions, rolePermissions, users } from './schema'
import { hashPassword } from '#/shared/lib/crypto'

const RESOURCES = ['users', 'projects', 'environments', 'stacks', 'containers', 'logs'] as const
const ACTIONS = ['create', 'read', 'update', 'delete'] as const

const PERMISSION_MATRIX: Record<string, Record<string, ('create' | 'read' | 'update' | 'delete')[]>> = {
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete'],
    environments: ['create', 'read', 'update', 'delete'],
    stacks: ['create', 'read', 'update', 'delete'],
    containers: ['create', 'read', 'update', 'delete'],
    logs: ['read'],
  },
  developer: {
    users: [],
    projects: ['read'],
    environments: ['read'],
    stacks: ['create', 'read', 'update', 'delete'],
    containers: ['create', 'read', 'update', 'delete'],
    logs: ['read'],
  },
  viewer: {
    users: [],
    projects: ['read'],
    environments: ['read'],
    stacks: ['read'],
    containers: ['read'],
    logs: ['read'],
  },
}

export async function runSeed() {
  console.log('Seeding roles...')
  const insertedRoles = await db
    .insert(roles)
    .values([
      { name: 'admin', description: 'Full access' },
      { name: 'developer', description: 'Infrastructure ops, no user admin' },
      { name: 'viewer', description: 'Read-only' },
    ])
    .returning()

  const adminRole = insertedRoles[0]!
  const developerRole = insertedRoles[1]!
  const viewerRole = insertedRoles[2]!

  console.log('Seeding permissions...')
  const allPerms: { id: string; resource: string; action: string }[] = []
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const [perm] = await db
        .insert(permissions)
        .values({
          resource,
          action,
          description: `${action} ${resource}`,
        })
        .returning()
      if (perm) allPerms.push(perm)
    }
  }

  console.log('Seeding role_permissions...')
  for (const [roleName, matrix] of Object.entries(PERMISSION_MATRIX)) {
    const role = roleName === 'admin' ? adminRole : roleName === 'developer' ? developerRole : viewerRole
    for (const perm of allPerms) {
      if (matrix[perm.resource]?.includes(perm.action as 'create' | 'read' | 'update' | 'delete')) {
        await db.insert(rolePermissions).values({ roleId: role.id, permissionId: perm.id })
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
