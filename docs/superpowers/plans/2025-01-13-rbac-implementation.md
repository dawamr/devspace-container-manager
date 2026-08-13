# RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full RBAC (Role-Based Access Control) for DevSpace — backend enforcement, administration UI (Users CRUD + Roles management with permission matrix), and route-level guards.

**Architecture:** Extend existing `app/modules/rbac/` module + create new `app/modules/users/` and `app/modules/roles/` modules following Clean Architecture (domain → infrastructure → server → presentation). Route guards via TanStack Router `beforeLoad` middleware pattern. All sensitive operations go through server functions with `requirePermission`.

**Tech Stack:** TanStack Start (server functions), TanStack Router (route guards), Drizzle ORM (PostgreSQL), Zod (validation), shadcn/ui (UI components), PostHog (analytics)

**Spec:** `docs/superpowers/specs/2025-01-13-rbac-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `app/shared/db/schema/rbac.ts` | **MODIFY** — add `updatedAt`, `isSystem` to roles; add unique constraint to permissions |
| `app/shared/db/schema/auth.ts` | **MODIFY** — add `updatedBy` to users |
| `app/modules/rbac/server/route-guard.ts` | Route guard middleware factory |
| `app/modules/users/domain/user-service.ts` | User CRUD business logic |
| `app/modules/users/infrastructure/user-repository.ts` | **EXTEND** — add CRUD queries |
| `app/modules/users/server/list-users.ts` | Server function: list users |
| `app/modules/users/server/create-user.ts` | Server function: create user |
| `app/modules/users/server/update-user.ts` | Server function: update user |
| `app/modules/users/server/delete-user.ts` | Server function: delete user |
| `app/modules/users/server/change-user-role.ts` | Server function: change user role |
| `app/modules/users/presentation/users-table.tsx` | Users data table component |
| `app/modules/users/presentation/user-form-dialog.tsx` | Create/edit user dialog |
| `app/modules/users/presentation/role-select.tsx` | Role dropdown selector |
| `app/modules/roles/domain/role-service.ts` | Role CRUD business logic |
| `app/modules/roles/infrastructure/role-repository.ts` | Role CRUD queries |
| `app/modules/roles/server/list-roles.ts` | Server function: list roles |
| `app/modules/roles/server/create-role.ts` | Server function: create role |
| `app/modules/roles/server/update-role.ts` | Server function: update role |
| `app/modules/roles/server/delete-role.ts` | Server function: delete role |
| `app/modules/roles/server/list-permissions.ts` | Server function: list all permissions |
| `app/modules/roles/server/update-role-permissions.ts` | Server function: update role permissions |
| `app/modules/roles/presentation/roles-table.tsx` | Roles data table component |
| `app/modules/roles/presentation/role-form-dialog.tsx` | Create/edit role dialog |
| `app/modules/roles/presentation/permission-matrix.tsx` | Interactive permission matrix |
| `app/routes/_dashboard.administration.users.tsx` | **MODIFY** — full users page |
| `app/routes/_dashboard.administration.roles.tsx` | **MODIFY** — full roles page |
| `app/routes/_dashboard.forbidden.tsx` | 403 forbidden page |

### Modified Files

| File | Change |
|------|--------|
| `app/shared/db/schema/rbac.ts` | Add `updatedAt`, `isSystem` to roles; unique on permissions |
| `app/shared/db/schema/auth.ts` | Add `updatedBy` to users |
| `app/shared/db/seed.ts` | Mark system roles with `isSystem: true` |
| `app/modules/users/infrastructure/user-repository.ts` | Add CRUD queries (list, create, update, delete) |
| `app/routes/_dashboard.administration.users.tsx` | Full users page with table + dialog |
| `app/routes/_dashboard.administration.roles.tsx` | Full roles page with table + matrix |
| `app/routes/_dashboard.tsx` | No change (auth guard stays) |

---

## Task 1: Schema Migration — Add RBAC Fields

**Files:**
- Modify: `app/shared/db/schema/rbac.ts`
- Modify: `app/shared/db/schema/auth.ts`
- Create: `drizzle/0001_rbac_enhancements.sql`

- [ ] **Step 1: Update rbac.ts schema**

```typescript
// app/shared/db/schema/rbac.ts
import { pgTable, uuid, varchar, timestamp, primaryKey, boolean, unique } from 'drizzle-orm/pg-core'

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 200 }),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resource: varchar('resource', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    description: varchar('description', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('permissions_resource_action_unique').on(t.resource, t.action)],
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)
```

- [ ] **Step 2: Update auth.ts schema**

Add `updatedBy` field to users table:

```typescript
// app/shared/db/schema/auth.ts — add to users table:
updatedBy: uuid('updated_by').references(() => users.id),
```

Full updated file:

```typescript
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'
import { roles } from './rbac'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

- [ ] **Step 3: Generate migration**

```bash
cd /srv/apps/mono/dev-spaces
pnpm exec drizzle-kit generate --name rbac_enhancements
```

Expected: New file `drizzle/0001_rbac_enhancements.sql` with ALTER TABLE statements adding `is_system`, `updated_at` to roles, `updated_by` to users, and unique constraint on permissions.

- [ ] **Step 4: Update seed to mark system roles**

Modify `app/shared/db/seed.ts` — change `getOrCreateRole` calls:

```typescript
const adminRole = await getOrCreateRole('admin', 'Full access', true)
const developerRole = await getOrCreateRole('developer', 'Infrastructure ops, no user admin', true)
const viewerRole = await getOrCreateRole('viewer', 'Read-only', true)
```

Update `getOrCreateRole` signature:

```typescript
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
```

- [ ] **Step 5: Run migration + seed**

```bash
# Run migration
pnpm exec drizzle-kit push

# Run seed
pnpm exec tsx app/shared/db/seed.ts
```

Expected: Migration applies. Seed updates roles with `is_system = true`. No errors.

- [ ] **Step 6: Commit**

```bash
git add app/shared/db/schema/rbac.ts app/shared/db/schema/auth.ts drizzle/ app/shared/db/seed.ts
git commit -m "feat(rbac): add is_system, updated_at, updated_by fields + unique constraint on permissions"
```

---

## Task 2: RBAC Route Guard Middleware

**Files:**
- Create: `app/modules/rbac/server/route-guard.ts`
- Create: `app/routes/_dashboard.forbidden.tsx`

- [ ] **Step 1: Create route guard factory**

```typescript
// app/modules/rbac/server/route-guard.ts
import { redirect } from '@tanstack/react-router'
import { checkPermissionWithBypass } from '../domain/permission-service'
import type { Resource, Action } from '../domain/constants'
import type { AuthUser } from '#/modules/auth/domain/auth-service'

type BeforeLoadContext = {
  context: { user: AuthUser }
}

export function createRouteGuard(resource: Resource, action: Action) {
  return async ({ context }: BeforeLoadContext) => {
    const allowed = await checkPermissionWithBypass(context.user.roleName, resource, action)
    if (!allowed) {
      throw redirect({ to: '/forbidden' })
    }
  }
}
```

- [ ] **Step 2: Create forbidden page**

```typescript
// app/routes/_dashboard.forbidden.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ShieldX } from 'lucide-react'

export const Route = createFileRoute('/_dashboard/forbidden')({
  staticData: { title: 'Forbidden' },
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <ShieldX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/modules/rbac/server/route-guard.ts app/routes/_dashboard.forbidden.tsx
git commit -m "feat(rbac): add route guard middleware + forbidden page"
```

---

## Task 3: Users Module — Domain + Repository

**Files:**
- Create: `app/modules/users/domain/user-service.ts`
- Modify: `app/modules/users/infrastructure/user-repository.ts`

- [ ] **Step 1: Read existing user-repository**

```bash
cat app/modules/users/infrastructure/user-repository.ts
```

- [ ] **Step 2: Extend user-repository with CRUD**

Add these functions to `app/modules/users/infrastructure/user-repository.ts`:

```typescript
// Add to existing imports:
import { eq, and, ilike, or, desc, asc, count } from 'drizzle-orm'
import { users, roles } from '#/shared/db/schema'
import { hashPassword } from '#/shared/lib/crypto'

// Types
export type UserWithRole = {
  id: string
  email: string
  name: string
  roleName: string
  roleId: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export type CreateUserInput = {
  email: string
  password: string
  name: string
  roleId: string
}

export type UpdateUserInput = {
  id: string
  email?: string
  name?: string
  roleId?: string
  isActive?: boolean
  updatedBy?: string
}

// List all users with role name
export async function listUsers(): Promise<UserWithRole[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(asc(users.name))
  return rows
}

// Find user by ID (with role name)
export async function findUserByIdWithRole(id: string): Promise<UserWithRole | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

// Check if email exists
export async function emailExists(email: string, excludeId?: string): Promise<boolean> {
  const conditions = [eq(users.email, email)]
  if (excludeId) {
    conditions.push(eq(users.id, excludeId))
  }
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1)
  return rows.length > 0
}

// Create user
export async function createUser(input: CreateUserInput): Promise<string> {
  const passwordHash = await hashPassword(input.password)
  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      roleId: input.roleId,
    })
    .returning({ id: users.id })
  if (!created) throw new Error('Failed to create user')
  return created.id
}

// Update user
export async function updateUser(input: UpdateUserInput): Promise<void> {
  const updates: Record<string, unknown> = {}
  if (input.email !== undefined) updates.email = input.email
  if (input.name !== undefined) updates.name = input.name
  if (input.roleId !== undefined) updates.roleId = input.roleId
  if (input.isActive !== undefined) updates.isActive = input.isActive
  if (input.updatedBy !== undefined) updates.updatedBy = input.updatedBy
  updates.updatedAt = new Date()

  await db.update(users).set(updates).where(eq(users.id, input.id))
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id))
}

// Count users by role
export async function countUsersByRole(roleId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.roleId, roleId))
  return result?.count ?? 0
}

// Count active admins
export async function countActiveAdmins(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(roles.name, 'admin'), eq(users.isActive, true)))
  return result?.count ?? 0
}
```

- [ ] **Step 3: Create user-service domain logic**

```typescript
// app/modules/users/domain/user-service.ts
import { z } from 'zod'
import {
  listUsers,
  findUserByIdWithRole,
  emailExists,
  createUser,
  updateUser,
  deleteUser,
  countActiveAdmins,
  type CreateUserInput,
  type UpdateUserInput,
} from '../infrastructure/user-repository'

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  roleId: z.string().uuid('Role ID tidak valid'),
})

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})

export type UserListItem = Awaited<ReturnType<typeof listUsers>>[number]

export async function getUsers() {
  return listUsers()
}

export async function getUserById(id: string) {
  const user = await findUserByIdWithRole(id)
  if (!user) throw new Error('NOT_FOUND')
  return user
}

export async function createNewUser(input: CreateUserInput, currentUserId: string) {
  const exists = await emailExists(input.email)
  if (exists) throw new Error('Email sudah digunakan')
  const userId = await createUser(input)
  return userId
}

export async function updateExistingUser(input: UpdateUserInput, currentUserId: string) {
  if (input.email) {
    const exists = await emailExists(input.email, input.id)
    if (exists) throw new Error('Email sudah digunakan')
  }
  await updateUser({ ...input, updatedBy: currentUserId })
}

export async function deleteExistingUser(userId: string, currentUserId: string) {
  // Prevent self-delete
  if (userId === currentUserId) {
    throw new Error('Tidak bisa menghapus akun sendiri')
  }
  // Prevent deleting last admin
  const user = await findUserByIdWithRole(userId)
  if (!user) throw new Error('NOT_FOUND')
  if (user.roleName === 'admin') {
    const adminCount = await countActiveAdmins()
    if (adminCount <= 1) {
      throw new Error('Tidak bisa menghapus admin terakhir')
    }
  }
  await deleteUser(userId)
}
```

- [ ] **Step 4: Commit**

```bash
git add app/modules/users/
git commit -m "feat(users): add user-service domain logic + extended repository CRUD"
```

---

## Task 4: Users Module — Server Functions

**Files:**
- Create: `app/modules/users/server/list-users.ts`
- Create: `app/modules/users/server/create-user.ts`
- Create: `app/modules/users/server/update-user.ts`
- Create: `app/modules/users/server/delete-user.ts`
- Create: `app/modules/users/server/change-user-role.ts`

- [ ] **Step 1: Create list-users server function**

```typescript
// app/modules/users/server/list-users.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getUsers } from '../domain/user-service'

export const listUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getUsers()
})
```

- [ ] **Step 2: Create create-user server function**

```typescript
// app/modules/users/server/create-user.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { createNewUser, createUserSchema } from '../domain/user-service'

export const createUserFn = createServerFn({ method: 'POST' })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'create')
    const userId = await createNewUser(data, currentUser.id)
    return { success: true, userId }
  })
```

- [ ] **Step 3: Create update-user server function**

```typescript
// app/modules/users/server/update-user.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingUser, updateUserSchema } from '../domain/user-service'

export const updateUserFn = createServerFn({ method: 'POST' })
  .validator(updateUserSchema)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'update')
    await updateExistingUser(data, currentUser.id)
    return { success: true }
  })
```

- [ ] **Step 4: Create delete-user server function**

```typescript
// app/modules/users/server/delete-user.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { deleteExistingUser } from '../domain/user-service'

const deleteUserInput = z.object({ id: z.string().uuid() })

export const deleteUserFn = createServerFn({ method: 'POST' })
  .validator(deleteUserInput)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'delete')
    await deleteExistingUser(data.id, currentUser.id)
    return { success: true }
  })
```

- [ ] **Step 5: Create change-user-role server function**

```typescript
// app/modules/users/server/change-user-role.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingUser } from '../domain/user-service'

const changeRoleInput = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
})

export const changeUserRoleFn = createServerFn({ method: 'POST' })
  .validator(changeRoleInput)
  .handler(async ({ data }) => {
    const currentUser = await requirePermission('users', 'update')
    await updateExistingUser({ id: data.userId, roleId: data.roleId }, currentUser.id)
    return { success: true }
  })
```

- [ ] **Step 6: Commit**

```bash
git add app/modules/users/server/
git commit -m "feat(users): add server functions (list, create, update, delete, change-role)"
```

---

## Task 5: Roles Module — Domain + Repository

**Files:**
- Create: `app/modules/roles/domain/role-service.ts`
- Create: `app/modules/roles/infrastructure/role-repository.ts`

- [ ] **Step 1: Create role-repository**

```typescript
// app/modules/roles/infrastructure/role-repository.ts
import { eq, and, desc, asc, count, inArray } from 'drizzle-orm'
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
```

- [ ] **Step 2: Create role-service domain logic**

```typescript
// app/modules/roles/domain/role-service.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add app/modules/roles/
git commit -m "feat(roles): add role-service domain logic + repository CRUD"
```

---

## Task 6: Roles Module — Server Functions

**Files:**
- Create: `app/modules/roles/server/list-roles.ts`
- Create: `app/modules/roles/server/create-role.ts`
- Create: `app/modules/roles/server/update-role.ts`
- Create: `app/modules/roles/server/delete-role.ts`
- Create: `app/modules/roles/server/list-permissions.ts`
- Create: `app/modules/roles/server/update-role-permissions.ts`

- [ ] **Step 1: Create list-roles server function**

```typescript
// app/modules/roles/server/list-roles.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getRoles } from '../domain/role-service'

export const listRolesFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getRoles()
})
```

- [ ] **Step 2: Create create-role server function**

```typescript
// app/modules/roles/server/create-role.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { createNewRole, createRoleSchema } from '../domain/role-service'

export const createRoleFn = createServerFn({ method: 'POST' })
  .validator(createRoleSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'create')
    const role = await createNewRole(data.name, data.description)
    return { success: true, roleId: role.id }
  })
```

- [ ] **Step 3: Create update-role server function**

```typescript
// app/modules/roles/server/update-role.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateExistingRole, updateRoleSchema } from '../domain/role-service'

export const updateRoleFn = createServerFn({ method: 'POST' })
  .validator(updateRoleSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'update')
    await updateExistingRole(data.id, { name: data.name, description: data.description })
    return { success: true }
  })
```

- [ ] **Step 4: Create delete-role server function**

```typescript
// app/modules/roles/server/delete-role.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { deleteExistingRole } from '../domain/role-service'

const deleteRoleInput = z.object({ id: z.string().uuid() })

export const deleteRoleFn = createServerFn({ method: 'POST' })
  .validator(deleteRoleInput)
  .handler(async ({ data }) => {
    await requirePermission('users', 'delete')
    await deleteExistingRole(data.id)
    return { success: true }
  })
```

- [ ] **Step 5: Create list-permissions server function**

```typescript
// app/modules/roles/server/list-permissions.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { getPermissions } from '../domain/role-service'

export const listPermissionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requirePermission('users', 'read')
  return await getPermissions()
})
```

- [ ] **Step 6: Create update-role-permissions server function**

```typescript
// app/modules/roles/server/update-role-permissions.ts
import { createServerFn } from '@tanstack/react-start'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { updateRolePermissions, updateRolePermissionsSchema } from '../domain/role-service'

export const updateRolePermissionsFn = createServerFn({ method: 'POST' })
  .validator(updateRolePermissionsSchema)
  .handler(async ({ data }) => {
    await requirePermission('users', 'update')
    await updateRolePermissions(data.roleId, data.permissionIds)
    return { success: true }
  })
```

- [ ] **Step 7: Commit**

```bash
git add app/modules/roles/server/
git commit -m "feat(roles): add server functions (list, create, update, delete, permissions)"
```

---

## Task 7: Users Presentation — Table + Form

**Files:**
- Create: `app/modules/users/presentation/users-table.tsx`
- Create: `app/modules/users/presentation/user-form-dialog.tsx`
- Create: `app/modules/users/presentation/role-select.tsx`

- [ ] **Step 1: Create role-select component**

```typescript
// app/modules/users/presentation/role-select.tsx
import { useQuery } from '@tanstack/react-query'
import { listRolesFn } from '#/modules/roles/server/list-roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'

type RoleSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function RoleSelect({ value, onValueChange, disabled }: RoleSelectProps) {
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRolesFn(),
  })

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih role" />
      </SelectTrigger>
      <SelectContent>
        {roles?.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Note:** Requires `select` shadcn/ui component. Run `pnpm exec shadcn@latest add select` if not present.

- [ ] **Step 2: Create user-form-dialog component**

```typescript
// app/modules/users/presentation/user-form-dialog.tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUserFn } from '../server/create-user'
import { updateUserFn } from '../server/update-user'
import { RoleSelect } from './role-select'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'

type UserFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id: string
    email: string
    name: string
    roleId: string
    isActive: boolean
  } | null
}

type FormState = {
  email: string
  password: string
  name: string
  roleId: string
  isActive: boolean
}

const emptyForm: FormState = {
  email: '',
  password: '',
  name: '',
  roleId: '',
  isActive: true,
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email,
        password: '',
        name: user.name,
        roleId: user.roleId,
        isActive: user.isActive,
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [user, open])

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await updateUserFn({
          data: {
            id: user!.id,
            email: form.email,
            name: form.name,
            roleId: form.roleId,
            isActive: form.isActive,
          },
        })
      } else {
        await createUserFn({
          data: {
            email: form.email,
            password: form.password,
            name: form.name,
            roleId: form.roleId,
          },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
    onError: (e: Error) => {
      setError(e.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Ubah data user.' : 'Buat user baru dengan akses role.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Role</Label>
            <RoleSelect
              value={form.roleId}
              onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
            />
          </div>
          {isEdit && (
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.isActive ? 'active' : 'inactive'}
                onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'active' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Note:** Requires `dialog` and `select` shadcn/ui components. Run `pnpm exec shadcn@latest add dialog select` if not present.

- [ ] **Step 3: Create users-table component**

```typescript
// app/modules/users/presentation/users-table.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsersFn } from '../server/list-users'
import { deleteUserFn } from '../server/delete-user'
import { UserFormDialog } from './user-form-dialog'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'
import { Input } from '#/shared/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

type User = Awaited<ReturnType<typeof listUsersFn>>[number]

export function UsersTable() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersFn(),
  })
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteUserFn({ data: { id: deleteId! } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteId(null)
    },
  })

  const filtered = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Tidak ada user
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.roleName === 'admin' ? 'default' : 'secondary'}>
                      {user.roleName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'outline'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditUser(user)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(user.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editUser} />

      {deleteId && (
        <DeleteUserDialog
          onCancel={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
          error={deleteMutation.error?.message}
        />
      )}
    </div>
  )
}

function DeleteUserDialog({
  onCancel,
  onConfirm,
  isLoading,
  error,
}: {
  onCancel: () => void
  onConfirm: () => void
  isLoading: boolean
  error?: string
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Hapus User?</DialogTitle>
          <DialogDescription>
            Tindakan ini tidak dapat dibatalkan. User akan dihapus permanen.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Menghapus...' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Note:** Requires `table` shadcn/ui component. Run `pnpm exec shadcn@latest add table` if not present. Also requires dialog import in this file — add `import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/shared/ui/dialog'` at top.

- [ ] **Step 4: Commit**

```bash
git add app/modules/users/presentation/
git commit -m "feat(users): add users table, form dialog, and role select components"
```

---

## Task 8: Roles Presentation — Table + Form + Permission Matrix

**Files:**
- Create: `app/modules/roles/presentation/roles-table.tsx`
- Create: `app/modules/roles/presentation/role-form-dialog.tsx`
- Create: `app/modules/roles/presentation/permission-matrix.tsx`

- [ ] **Step 1: Create role-form-dialog component**

```typescript
// app/modules/roles/presentation/role-form-dialog.tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRoleFn } from '../server/create-role'
import { updateRoleFn } from '../server/update-role'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { Textarea } from '#/shared/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'

type RoleFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: {
    id: string
    name: string
    description: string | null
    isSystem: boolean
  } | null
}

type FormState = {
  name: string
  description: string
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEdit = !!role
  const [form, setForm] = useState<FormState>({ name: '', description: '' })
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role) {
      setForm({ name: role.name, description: role.description ?? '' })
    } else {
      setForm({ name: '', description: '' })
    }
    setError(null)
  }, [role, open])

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        await updateRoleFn({
          data: {
            id: role!.id,
            name: form.name,
            description: form.description || null,
          },
        })
      } else {
        await createRoleFn({
          data: {
            name: form.name,
            description: form.description || undefined,
          },
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Tambah Role'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Ubah data role.'
              : 'Buat role baru untuk mengatur akses permission.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Role</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={isEdit && role?.isSystem}
              required
              placeholder="contoh: editor"
            />
            {isEdit && role?.isSystem && (
              <p className="text-xs text-muted-foreground">System role tidak bisa diubah namanya</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat role"
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Note:** Requires `textarea` shadcn/ui component. Run `pnpm exec shadcn@latest add textarea` if not present.

- [ ] **Step 2: Create permission-matrix component**

```typescript
// app/modules/roles/presentation/permission-matrix.tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPermissionsFn } from '../server/list-permissions'
import { updateRolePermissionsFn } from '../server/update-role-permissions'
import { getRolePermissions } from '../domain/role-service'
import { Button } from '#/shared/ui/button'
import { Checkbox } from '#/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'

type PermissionMatrixProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: {
    id: string
    name: string
    isSystem: boolean
  } | null
}

const RESOURCES = ['users', 'projects', 'environments', 'stacks', 'containers', 'logs'] as const
const ACTIONS = ['create', 'read', 'update', 'delete'] as const

export function PermissionMatrix({ open, onOpenChange, role }: PermissionMatrixProps) {
  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => listPermissionsFn(),
    enabled: open,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role && open) {
      getRolePermissions(role.id).then((ids) => {
        setSelectedIds(new Set(ids))
      })
    }
  }, [role, open])

  const mutation = useMutation({
    mutationFn: () =>
      updateRolePermissionsFn({
        data: { roleId: role!.id, permissionIds: Array.from(selectedIds) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  if (!role || !permissions) return null

  // Group permissions by resource
  const permissionsByResource = new Map<string, { id: string; action: string }[]>()
  for (const perm of permissions) {
    if (!permissionsByResource.has(perm.resource)) {
      permissionsByResource.set(perm.resource, [])
    }
    permissionsByResource.get(perm.resource)!.push({ id: perm.id, action: perm.action })
  }

  const togglePermission = (permId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
  }

  const toggleResource = (resource: string, allPerms: { id: string }[]) => {
    const allSelected = allPerms.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const p of allPerms) {
        if (allSelected) {
          next.delete(p.id)
        } else {
          next.add(p.id)
        }
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Permission Matrix — {role.name}</DialogTitle>
          <DialogDescription>
            Centang permission yang ingin diberikan ke role ini.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium">Resource</th>
                {ACTIONS.map((action) => (
                  <th key={action} className="px-3 py-2 text-center font-medium capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => {
                const perms = permissionsByResource.get(resource) ?? []
                const allSelected = perms.length > 0 && perms.every((p) => selectedIds.has(p.id))
                return (
                  <tr key={resource} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => toggleResource(resource, perms)}
                        />
                        <span className="capitalize">{resource}</span>
                      </div>
                    </td>
                    {ACTIONS.map((action) => {
                      const perm = perms.find((p) => p.action === action)
                      return (
                        <td key={action} className="px-3 py-2 text-center">
                          {perm ? (
                            <Checkbox
                              checked={selectedIds.has(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Permission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Note:** Requires `checkbox` shadcn/ui component. Run `pnpm exec shadcn@latest add checkbox` if not present.

- [ ] **Step 3: Create roles-table component**

```typescript
// app/modules/roles/presentation/roles-table.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listRolesFn } from '../server/list-roles'
import { deleteRoleFn } from '../server/delete-role'
import { RoleFormDialog } from './role-form-dialog'
import { PermissionMatrix } from './permission-matrix'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react'

type Role = Awaited<ReturnType<typeof listRolesFn>>[number]

export function RolesTable() {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRolesFn(),
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoleFn({ data: { id: deleteRole!.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDeleteRole(null)
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setEditRole(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Role
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : roles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Tidak ada role
                </TableCell>
              </TableRow>
            ) : (
              roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {role.name}
                      {role.isSystem && <Badge variant="secondary">System</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {role.description ?? '—'}
                  </TableCell>
                  <TableCell>{role.permissionCount}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPermRole(role)}
                        title="Edit Permissions"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditRole(role)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteRole(role)}
                        className="text-destructive"
                        disabled={role.isSystem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editRole} />
      <PermissionMatrix open={!!permRole} onOpenChange={() => setPermRole(null)} role={permRole} />

      {deleteRole && (
        <Dialog open onOpenChange={() => setDeleteRole(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Hapus Role?</DialogTitle>
              <DialogDescription>
                Role <strong>{deleteRole.name}</strong> akan dihapus permanen.
              </DialogDescription>
            </DialogHeader>
            {deleteMutation.error && (
              <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRole(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/modules/roles/presentation/
git commit -m "feat(roles): add roles table, form dialog, and permission matrix components"
```

---

## Task 9: Wire Routes — Users + Roles Pages + Route Guards

**Files:**
- Modify: `app/routes/_dashboard.administration.users.tsx`
- Modify: `app/routes/_dashboard.administration.roles.tsx`

- [ ] **Step 1: Update users page route**

```typescript
// app/routes/_dashboard.administration.users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { UsersTable } from '#/modules/users/presentation/users-table'

export const Route = createFileRoute('/_dashboard/administration/users')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Users' },
  component: UsersPage,
})

function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Kelola user dan role access untuk DevSpace.
        </p>
      </div>
      <UsersTable />
    </div>
  )
}
```

- [ ] **Step 2: Update roles page route**

```typescript
// app/routes/_dashboard.administration.roles.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createRouteGuard } from '#/modules/rbac/server/route-guard'
import { RolesTable } from '#/modules/roles/presentation/roles-table'

export const Route = createFileRoute('/_dashboard/administration/roles')({
  beforeLoad: createRouteGuard('users', 'read'),
  staticData: { title: 'Roles' },
  component: RolesPage,
})

function RolesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Kelola role dan permission untuk setiap user.
        </p>
      </div>
      <RolesTable />
    </div>
  )
}
```

- [ ] **Step 3: Install missing shadcn components**

```bash
cd /srv/apps/mono/dev-spaces
pnpm exec shadcn@latest add dialog select table checkbox textarea
```

Expected: Components installed to `app/shared/ui/`.

- [ ] **Step 4: Commit**

```bash
git add app/routes/_dashboard.administration.users.tsx app/routes/_dashboard.administration.roles.tsx app/shared/ui/
git commit -m "feat(rbac): wire users + roles pages with route guards"
```

---

## Task 10: PostHog Event Tracking

**Files:**
- Modify: `app/modules/users/presentation/users-table.tsx`
- Modify: `app/modules/users/presentation/user-form-dialog.tsx`
- Modify: `app/modules/roles/presentation/roles-table.tsx`
- Modify: `app/modules/roles/presentation/role-form-dialog.tsx`
- Modify: `app/modules/roles/presentation/permission-matrix.tsx`

- [ ] **Step 1: Read existing PostHog utility**

```bash
cat app/shared/lib/posthog.ts
```

- [ ] **Step 2: Add PostHog events to users-table**

Add to `app/modules/users/presentation/users-table.tsx` (after imports):

```typescript
import { trackEvent } from '#/shared/lib/posthog'

// In component, after useQuery:
useEffect(() => {
  trackEvent('admin_users_viewed')
}, [])

// In createMutation onSuccess:
trackEvent('admin_user_created', { userId: result.userId, roleId: form.roleId })

// In updateMutation onSuccess:
trackEvent('admin_user_updated', { userId: user.id, fields: Object.keys(form).filter(k => form[k as keyof FormState] !== '') })

// In deleteMutation onSuccess:
trackEvent('admin_user_deleted', { userId: deleteId })
```

- [ ] **Step 3: Add PostHog events to roles components**

In `app/modules/roles/presentation/roles-table.tsx`:

```typescript
import { trackEvent } from '#/shared/lib/posthog'

useEffect(() => {
  trackEvent('admin_roles_viewed')
}, [])

// In createRoleFn success:
trackEvent('admin_role_created', { roleId: result.roleId })

// In updateRoleFn success:
trackEvent('admin_role_updated', { roleId: role.id, fields: Object.keys(updates) })

// In deleteRoleFn success:
trackEvent('admin_role_deleted', { roleId: deleteRole.id })

// In permissionMatrix update success:
trackEvent('admin_permissions_updated', { roleId: role.id, permissionCount: selectedIds.size })
```

- [ ] **Step 4: Commit**

```bash
git add app/modules/users/presentation/ app/modules/roles/presentation/
git commit -m "feat(rbac): add PostHog event tracking for admin actions"
```

---

## Task 11: Final Integration Test

**Files:**
- None (verification only)

- [ ] **Step 1: Run development server**

```bash
cd /srv/apps/mono/dev-spaces
# Restart container jika pakai Docker
# docker compose -f /srv/docker/compose/dev-spaces.dev.yml restart
# Atau jika running directly:
pnpm dev
```

- [ ] **Step 2: Verify checklist**

| Check | Expected |
|-------|----------|
| Login sebagai admin | Redirect ke dashboard |
| Navigate to /administration/users | Users table visible dengan admin user |
| Create new user | User dibuat, muncul di table |
| Edit user role | Role berubah di table |
| Delete user | User hilang dari table |
| Navigate to /administration/roles | Roles table visible dengan 3 system roles |
| Create new role | Role dibuat, muncul di table |
| Edit permission matrix | Permissions saved, count updated |
| Delete role (system) | Error: "System role tidak bisa dihapus" |
| Delete role (non-system with users) | Error: "Role masih digunakan oleh N user" |
| Navigate to /forbidden | 403 page visible |

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(rbac): Sprint 1 RBAC complete — users, roles, permission matrix, route guards"
```

<!-- END_PLAN -->
