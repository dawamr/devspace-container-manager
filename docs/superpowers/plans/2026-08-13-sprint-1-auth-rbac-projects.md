# Sprint 1 — Auth, RBAC, Projects: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement authentication (cookie session + bcrypt), RBAC (full normalized schema), and project CRUD with route protection — enabling login → project selection in < 90 seconds.

**Architecture:** Custom cookie-based session auth stored in PostgreSQL `sessions` table. Drizzle ORM with split-per-module schema. TanStack Start server functions for all data operations. Route protection via `beforeLoad` guards. Full normalized RBAC (roles + permissions + role_permissions).

**Tech Stack:** TanStack Start v1.168+, React 19, TypeScript strict, Drizzle ORM, PostgreSQL (Patroni HA), bcryptjs, posthog-js, Tailwind CSS v4, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-08-13-sprint-1-auth-rbac-projects.md` — read before executing.

---

## File Structure

### New files to create:

```
app/shared/db/
├── client.ts                          # Drizzle singleton (postgres-js pool)
└── schema/
    ├── auth.ts                        # users, sessions tables
    ├── rbac.ts                        # roles, permissions, role_permissions tables
    └── projects.ts                    # projects, project_members, environments tables

app/shared/lib/
├── crypto.ts                          # bcrypt hash/compare wrapper
└── posthog.ts                         # PostHog client init

app/modules/auth/
├── domain/
│   ├── auth-service.ts                # login, logout, verifyCredentials, createSession, deleteSession
│   └── session.ts                     # cookie get/set/delete, session validation
├── infrastructure/
│   └── user-repository.ts             # DB queries: findUserByEmail, findUserById, findSessionById, insertSession, deleteSession, touchSessionExpiry
└── server/
    ├── login.ts                       # createServerFn POST /login
    ├── logout.ts                      # createServerFn POST /logout
    └── get-current-user.ts            # createServerFn GET /getCurrentUser

app/modules/rbac/
├── domain/
│   ├── permission-service.ts          # checkPermission(userRoleId, resource, action)
│   └── constants.ts                   # ROLE_NAMES, RESOURCES, ACTIONS enums
├── infrastructure/
│   └── permission-repository.ts       # DB queries: hasPermission
└── server/
    └── require-permission.ts          # server fn middleware/guard

app/modules/projects/
├── domain/
│   └── project-service.ts             # CRUD logic + Zod schemas
├── infrastructure/
│   └── project-repository.ts          # DB queries: insert, findAll, findById, update, delete
└── server/
    ├── list-projects.ts               # createServerFn GET
    ├── get-project.ts                 # createServerFn GET
    ├── create-project.ts              # createServerFn POST
    ├── update-project.ts              # createServerFn POST
    └── delete-project.ts              # createServerFn POST

app/modules/users/
├── infrastructure/
│   └── user-repository.ts             # DB queries: findAll (for admin user list)
└── server/
    └── list-users.ts                  # createServerFn GET (admin only)

app/shared/db/seed.ts                  # Seed: roles, permissions, role_permissions, admin user

scripts/seed.ts                        # Entry point: `npx tsx scripts/seed.ts`
```

### Files to modify:

```
app/shared/db/schema/index.ts          # barrel export (was: `export {}`)
app/shared/config/env.ts               # add VITE_POSTHOG_KEY, VITE_POSTHOG_HOST (optional)
app/routes/__root.tsx                  # init PostHog on client
app/routes/_auth.tsx                   # add beforeLoad: redirect to / if logged in
app/routes/_auth.login.tsx             # wire to real login server fn
app/routes/_dashboard.tsx              # add beforeLoad: redirect to /login if not authed
app/routes/_dashboard.projects.tsx     # wire to listProjects server fn
app/shared/components/layout/app-header.tsx  # add logout button
package.json                           # add drizzle-orm, postgres, bcryptjs, posthog-js
.env.example                           # add VITE_POSTHOG_KEY, VITE_POSTHOG_HOST
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Modify: `app/shared/db/schema/index.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
cd /srv/apps/mono/dev-spaces
pnpm add drizzle-orm postgres bcryptjs posthog-js
```

Expected: exits 0, `package.json` `dependencies` gains `drizzle-orm`, `postgres`, `bcryptjs`, `posthog-js`.

- [ ] **Step 2: Install dev dependency for seed script**

```bash
pnpm add -D tsx @types/bcryptjs
```

Expected: exits 0, `devDependencies` gains `tsx`, `@types/bcryptjs`.

- [ ] **Step 3: Add seed script to package.json**

Add to `scripts` section in `package.json`:

```json
"db:seed": "tsx scripts/seed.ts",
"db:migrate": "drizzle-kit migrate",
"db:generate": "drizzle-kit generate"
```

- [ ] **Step 4: Verify installs**

```bash
node -e "require('drizzle-orm'); require('postgres'); require('bcryptjs'); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add drizzle-orm, postgres, bcryptjs, posthog-js dependencies"
```


## Task 2: DB Client + Schema

**Files:**
- Create: `app/shared/db/client.ts`
- Create: `app/shared/db/schema/auth.ts`
- Create: `app/shared/db/schema/rbac.ts`
- Create: `app/shared/db/schema/projects.ts`
- Modify: `app/shared/db/schema/index.ts`

- [ ] **Step 1: Create Drizzle client singleton**

Create `app/shared/db/client.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '#/shared/config/env'
import * as schema from './schema'

const client = postgres(env.DATABASE_URL, { max: 10 })

export const db = drizzle(client, { schema })
export type DB = typeof db
```

- [ ] **Step 2: Create RBAC schema**

Create `app/shared/db/schema/rbac.ts`:

```typescript
import { pgTable, uuid, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core'

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  description: varchar('description', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

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

- [ ] **Step 3: Create auth schema**

Create `app/shared/db/schema/auth.ts`:

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

- [ ] **Step 4: Create projects schema**

Create `app/shared/db/schema/projects.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdById: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.projectId, t.userId)],
)
```

- [ ] **Step 5: Update barrel export**

Replace content of `app/shared/db/schema/index.ts`:

```typescript
export * from './auth'
export * from './rbac'
export * from './projects'
```

- [ ] **Step 6: Generate migration**

```bash
cd /srv/apps/mono/dev-spaces
npx drizzle-kit generate --name init
```

Expected: creates `drizzle/0000_init.sql` (or similar). Exits 0.

- [ ] **Step 7: Apply migration**

```bash
npx drizzle-kit migrate
```

Expected: exits 0. Verify tables:

```bash
docker exec -i paperclip-postgres psql -h 172.17.0.1 -p 5002 -U devspace -d devspace -c '\dt'
```

Expected output includes: `users`, `sessions`, `roles`, `permissions`, `role_permissions`, `projects`, `project_members`.

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 9: Commit**

```bash
git add app/shared/db/ drizzle/
git commit -m "feat(db): add drizzle schema — users, sessions, roles, permissions, projects"
```


## Task 3: Seed Script

**Files:**
- Create: `app/shared/lib/crypto.ts`
- Create: `app/shared/db/seed.ts`
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create crypto wrapper**

Create `app/shared/lib/crypto.ts`:

```typescript
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 2: Create seed data module**

Create `app/shared/db/seed.ts`:

```typescript
import { db } from './client'
import { roles, permissions, rolePermissions, users } from './schema'
import { hashPassword } from '#/shared/lib/crypto'

const RESOURCES = ['users', 'projects', 'environments', 'stacks', 'containers', 'logs'] as const
const ACTIONS = ['create', 'read', 'update', 'delete'] as const

// Permission matrix: which actions each role gets per resource
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
  const adminRole = (await db.insert(roles).values([
    { name: 'admin', description: 'Full access' },
    { name: 'developer', description: 'Infrastructure ops, no user admin' },
    { name: 'viewer', description: 'Read-only' },
  ]).returning())[0]!

  const developerRole = (await db.select().from(roles).where(eq(roles.name, 'developer')))[0]!
  const viewerRole = (await db.select().from(roles).where(eq(roles.name, 'viewer')))[0]!

  console.log('Seeding permissions...')
  const allPerms: { id: string; resource: string; action: string }[] = []
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const [perm] = await db.insert(permissions).values({
        resource,
        action,
        description: `${action} ${resource}`,
      }).returning()
      if (perm) allPerms.push(perm)
    }
  }

  console.log('Seeding role_permissions...')
  for (const [roleName, matrix] of Object.entries(PERMISSION_MATRIX)) {
    const role = roleName === 'admin' ? adminRole : roleName === 'developer' ? developerRole : viewerRole
    for (const perm of allPerms) {
      if (matrix[perm.resource]?.includes(perm.action as any)) {
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
```

Note: add `import { eq } from 'drizzle-orm'` at top of seed.ts.

- [ ] **Step 3: Create seed entry point**

Create `scripts/seed.ts`:

```typescript
import 'dotenv/config'
import { runSeed } from '../app/shared/db/seed'

await runSeed()
process.exit(0)
```

- [ ] **Step 4: Run seed**

```bash
cd /srv/apps/mono/dev-spaces
npx tsx scripts/seed.ts
```

Expected: prints "Seed complete." and admin credentials. Exits 0.

- [ ] **Step 5: Verify seeded data**

```bash
docker exec -i paperclip-postgres psql -h 172.17.0.1 -p 5002 -U devspace -d devspace -c \
  "SELECT r.name as role, COUNT(rp.*) as perms FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id GROUP BY r.name"
```

Expected: admin=22, developer=11, viewer=6 (or similar counts).

- [ ] **Step 6: Commit**

```bash
git add app/shared/lib/crypto.ts app/shared/db/seed.ts scripts/seed.ts
git commit -m "feat(db): add seed script — roles, permissions, admin user"
```


## Task 4: Auth Domain — Session + Service + Repository

**Files:**
- Create: `app/modules/auth/infrastructure/user-repository.ts`
- Create: `app/modules/auth/domain/session.ts`
- Create: `app/modules/auth/domain/auth-service.ts`

- [ ] **Step 1: Create user repository**

Create `app/modules/auth/infrastructure/user-repository.ts`:

```typescript
import { eq, lt } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { users, sessions, roles } from '#/shared/db/schema'

export type UserWithRole = {
  id: string
  email: string
  name: string
  isActive: boolean
  roleId: string
  roleName: string
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email))
    .limit(1)
  return rows[0] ?? null
}

export async function findUserById(id: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function findSessionById(sessionId: string) {
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertSession(userId: string, expiresAt: Date) {
  const [row] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id })
  return row?.id ?? null
}

export async function deleteSessionById(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export async function touchSessionExpiry(sessionId: string, expiresAt: Date) {
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId))
}

export async function updateLastLogin(userId: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId))
}
```

- [ ] **Step 2: Create session cookie utilities**

Create `app/modules/auth/domain/session.ts`:

```typescript
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { env } from '#/shared/config/env'

const SESSION_COOKIE_NAME = 'devspace_sid'
const SESSION_TTL_DAYS = 7

export function getSessionIdFromCookie(): string | undefined {
  return getCookie(SESSION_COOKIE_NAME)
}

export function setSessionCookie(sessionId: string) {
  setCookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export function getSessionExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + SESSION_TTL_DAYS)
  return d
}
```

- [ ] **Step 3: Create auth service**

Create `app/modules/auth/domain/auth-service.ts`:

```typescript
import { verifyPassword } from '#/shared/lib/crypto'
import {
  findUserByEmail,
  findUserById,
  findSessionById,
  insertSession,
  deleteSessionById,
  touchSessionExpiry,
  updateLastLogin,
  deleteExpiredSessions,
} from '../infrastructure/user-repository'
import {
  getSessionIdFromCookie,
  setSessionCookie,
  clearSessionCookie,
  getSessionExpiry,
} from './session'

export type AuthUser = {
  id: string
  email: string
  name: string
  roleName: string
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('Email atau password salah')
  if (!user.isActive) throw new Error('Akun dinonaktifkan')

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error('Email atau password salah')

  const expiresAt = getSessionExpiry()
  const sessionId = await insertSession(user.id, expiresAt)
  if (!sessionId) throw new Error('Gagal membuat session')

  setSessionCookie(sessionId)
  await updateLastLogin(user.id)
  await deleteExpiredSessions()

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleName: user.roleName,
  }
}

export async function logout() {
  const sessionId = getSessionIdFromCookie()
  if (sessionId) {
    await deleteSessionById(sessionId)
  }
  clearSessionCookie()
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionId = getSessionIdFromCookie()
  if (!sessionId) return null

  const session = await findSessionById(sessionId)
  if (!session) return null

  // Session expired
  if (session.expiresAt < new Date()) {
    await deleteSessionById(sessionId)
    return null
  }

  // Sliding session: renew expiry
  await touchSessionExpiry(sessionId, getSessionExpiry())

  const user = await findUserById(session.userId)
  if (!user || !user.isActive) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleName: user.roleName,
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add app/modules/auth/ app/shared/lib/crypto.ts
git commit -m "feat(auth): add session management, auth service, user repository"
```


## Task 5: Auth Server Functions + Login Page Wiring

**Files:**
- Create: `app/modules/auth/server/login.ts`
- Create: `app/modules/auth/server/logout.ts`
- Create: `app/modules/auth/server/get-current-user.ts`
- Modify: `app/routes/_auth.login.tsx`
- Modify: `app/shared/components/layout/app-header.tsx`

- [ ] **Step 1: Create login server function**

Create `app/modules/auth/server/login.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { login } from '../domain/auth-service'

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const loginFn = createServerFn('POST', async (data: unknown) => {
  const { email, password } = loginInput.parse(data)
  const user = await login(email, password)
  return { success: true, user }
})
```

- [ ] **Step 2: Create logout server function**

Create `app/modules/auth/server/logout.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { logout } from '../domain/auth-service'

export const logoutFn = createServerFn('POST', async () => {
  await logout()
  return { success: true }
})
```

- [ ] **Step 3: Create get-current-user server function**

Create `app/modules/auth/server/get-current-user.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '../domain/auth-service'

export const getCurrentUserFn = createServerFn('GET', async () => {
  return await getCurrentUser()
})
```

- [ ] **Step 4: Rewrite login page**

Replace content of `app/routes/_auth.login.tsx`:

```typescript
import type { FormEvent } from 'react'
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { loginFn } from '#/modules/auth/server/login'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await loginFn({ data: { email, password } })
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Masuk ke DevSpace</h2>
        <p className="text-sm text-muted-foreground">
          Gunakan akun yang diberikan admin untuk masuk.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@devspace.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Add logout button to AppHeader**

Read current `app/shared/components/layout/app-header.tsx` first. Then add a logout button in the avatar/user menu area:

```typescript
import { useNavigate } from '@tanstack/react-router'
import { logoutFn } from '#/modules/auth/server/logout'
import { LogOut } from 'lucide-react'

// Inside the component, add logout handler:
async function handleLogout() {
  await logoutFn()
  navigate({ to: '/login' })
}

// Add button (in the right side of header, near avatar):
<button
  onClick={handleLogout}
  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
>
  <LogOut className="size-4" />
  <span className="hidden sm:inline">Keluar</span>
</button>
```

Note: adapt placement to existing header structure — check the file and place the button sensibly in the right-side actions.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add app/modules/auth/server/ app/routes/_auth.login.tsx app/shared/components/layout/app-header.tsx
git commit -m "feat(auth): wire login/logout server functions to UI"
```


## Task 6: Route Protection — beforeLoad Guards

**Files:**
- Modify: `app/routes/_auth.tsx`
- Modify: `app/routes/_dashboard.tsx`

- [ ] **Step 1: Read current _auth.tsx and _dashboard.tsx**

```bash
cat app/routes/_auth.tsx
cat app/routes/_dashboard.tsx
```

Note the current structure — they are simple layout routes with Outlet.

- [ ] **Step 2: Add beforeLoad guard to _dashboard.tsx**

Replace content of `app/routes/_dashboard.tsx`:

```typescript
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { DashboardShell } from '#/shared/components/layout/dashboard-shell'

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user }
  },
  component: DashboardLayoutRoute,
})

function DashboardLayoutRoute() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  )
}
```

- [ ] **Step 3: Add beforeLoad redirect to _auth.tsx**

Replace content of `app/routes/_auth.tsx`:

```typescript
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { AuthLayout } from '#/shared/components/layout/auth-layout'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 5: Test route protection manually**

```bash
pnpm dev
```

- Visit `http://localhost:3000/` → should redirect to `/login`
- Visit `http://localhost:3000/login` while not logged in → should show login page
- Login with admin credentials → should redirect to `/`

- [ ] **Step 6: Commit**

```bash
git add app/routes/_auth.tsx app/routes/_dashboard.tsx
git commit -m "feat(auth): add route protection — beforeLoad guards"
```


## Task 7: RBAC Domain — Permission Checker

**Files:**
- Create: `app/modules/rbac/domain/constants.ts`
- Create: `app/modules/rbac/infrastructure/permission-repository.ts`
- Create: `app/modules/rbac/domain/permission-service.ts`
- Create: `app/modules/rbac/server/require-permission.ts`

- [ ] **Step 1: Create RBAC constants**

Create `app/modules/rbac/domain/constants.ts`:

```typescript
export const ROLE_NAMES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
} as const

export const RESOURCES = {
  USERS: 'users',
  PROJECTS: 'projects',
  ENVIRONMENTS: 'environments',
  STACKS: 'stacks',
  CONTAINERS: 'containers',
  LOGS: 'logs',
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES]
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS]
```

- [ ] **Step 2: Create permission repository**

Create `app/modules/rbac/infrastructure/permission-repository.ts`:

```typescript
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
```

- [ ] **Step 3: Create permission service**

Create `app/modules/rbac/domain/permission-service.ts`:

```typescript
import { hasPermission } from '../infrastructure/permission-repository'
import type { Resource, Action } from './constants'

export async function checkPermission(
  roleName: string,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  return hasPermission(roleName, resource, action)
}

// Admin bypasses all checks
export async function checkPermissionWithBypass(
  roleName: string,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  if (roleName === 'admin') return true
  return hasPermission(roleName, resource, action)
}
```

- [ ] **Step 4: Create require-permission server guard**

Create `app/modules/rbac/server/require-permission.ts`:

```typescript
import { getCurrentUserFn } from '#/modules/auth/server/get-current-user'
import { checkPermissionWithBypass } from '#/modules/rbac/domain/permission-service'
import type { Resource, Action } from '#/modules/rbac/domain/constants'

export async function requirePermission(
  resource: Resource,
  action: Action,
): Promise<{ id: string; email: string; name: string; roleName: string }> {
  const user = await getCurrentUserFn()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  const allowed = await checkPermissionWithBypass(user.roleName, resource, action)
  if (!allowed) {
    throw new Error('FORBIDDEN')
  }
  return user
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add app/modules/rbac/
git commit -m "feat(rbac): add permission checker, repository, server guard"
```


## Task 8: Project CRUD — Domain + Server Functions + UI

**Files:**
- Create: `app/modules/projects/infrastructure/project-repository.ts`
- Create: `app/modules/projects/domain/project-service.ts`
- Create: `app/modules/projects/server/list-projects.ts`
- Create: `app/modules/projects/server/get-project.ts`
- Create: `app/modules/projects/server/create-project.ts`
- Create: `app/modules/projects/server/update-project.ts`
- Create: `app/modules/projects/server/delete-project.ts`
- Modify: `app/routes/_dashboard.projects.tsx`

- [ ] **Step 1: Create project repository**

Create `app/modules/projects/infrastructure/project-repository.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { projects } from '#/shared/db/schema'

export type ProjectRow = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert

export async function findAllProjects() {
  return db.select().from(projects).orderBy(projects.createdAt)
}

export async function findProjectById(id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  return rows[0] ?? null
}

export async function insertProject(data: ProjectInsert) {
  const [row] = await db.insert(projects).values(data).returning()
  return row
}

export async function updateProject(id: string, data: Partial<ProjectInsert>) {
  const [row] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
  return row
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id))
}
```

- [ ] **Step 2: Create project service with Zod validation**

Create `app/modules/projects/domain/project-service.ts`:

```typescript
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

export async function listProjects() {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.READ)
  return findAllProjects()
}

export async function getProject(id: string) {
  await requirePermission(RESOURCES.PROJECTS, ACTIONS.READ)
  return findProjectById(id)
}

export async function createProject(input: z.infer<typeof projectCreateSchema>) {
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
```

- [ ] **Step 3: Create server functions**

Create `app/modules/projects/server/list-projects.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { listProjects } from '../domain/project-service'

export const listProjectsFn = createServerFn('GET', async () => {
  return await listProjects()
})
```

Create `app/modules/projects/server/create-project.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { createProject, projectCreateSchema } from '../domain/project-service'

export const createProjectFn = createServerFn('POST', async (data: unknown) => {
  const input = projectCreateSchema.parse(data)
  return await createProject(input)
})
```

Create `app/modules/projects/server/delete-project.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { deleteProjectService } from '../domain/project-service'

export const deleteProjectFn = createServerFn('POST', async (data: unknown) => {
  const input = data as { id: string }
  return await deleteProjectService(input.id)
})
```

- [ ] **Step 4: Rewrite projects page UI**

Read current `app/routes/_dashboard.projects.tsx` first:

```bash
cat app/routes/_dashboard.projects.tsx
```

Then replace with real data integration. Create `app/routes/_dashboard.projects.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Folder } from 'lucide-react'
import { listProjectsFn } from '#/modules/projects/server/list-projects'
import { createProjectFn } from '#/modules/projects/server/create-project'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { useState } from 'react'
import type { FormEvent } from 'react'

export const Route = createFileRoute('/_dashboard/projects')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof listProjectsFn>>>([])

  async function loadProjects() {
    const data = await listProjectsFn()
    setProjects(data)
  }

  // Load on mount — use useEffect or route loader
  // For simplicity, use route loader:
  // Actually for SSR with TanStack Start, use loader:

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await createProjectFn({ data: { name, description: description || undefined } })
      setName('')
      setDescription('')
      setShowForm(false)
      await loadProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Kelola project & environment tim</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 size-4" />
          Project Baru
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nama Project</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Internal Tools"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Deskripsi</Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada project. Buat project pertama.</p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Folder className="mt-0.5 size-5 text-primary" />
              <div>
                <h3 className="font-medium text-card-foreground">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

Note: The above uses client-side state for simplicity in Sprint 1. For production, convert to TanStack Start `loader` for SSR data fetching. This is acceptable per sprint DoD ("basic UI list").

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 6: Test project CRUD manually**

```bash
pnpm dev
```

- Login → navigate to Projects page
- Click "Project Baru" → fill form → submit → project appears in list

- [ ] **Step 7: Commit**

```bash
git add app/modules/projects/ app/routes/_dashboard.projects.tsx
git commit -m "feat(projects): add CRUD server functions + projects page UI"
```


## Task 9: PostHog Integration

**Files:**
- Modify: `app/shared/config/env.ts`
- Modify: `app/routes/__root.tsx`
- Modify: `app/routes/_auth.login.tsx`
- Modify: `.env.example`

- [ ] **Step 1: Add PostHog env vars to config**

Update `app/shared/config/env.ts` — add optional PostHog env vars (client-exposed):

```typescript
import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORTAINER_URL: z.string().url(),
  PORTAINER_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
})

export const env = envSchema.parse(process.env)

// Client-exposed env vars (must be prefixed with VITE_)
const clientEnvSchema = z.object({
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional(),
})

export const clientEnv = clientEnvSchema.parse({
  VITE_POSTHOG_KEY: process.env.VITE_POSTHOG_KEY,
  VITE_POSTHOG_HOST: process.env.VITE_POSTHOG_HOST,
})
```

- [ ] **Step 2: Create PostHog lib**

Create `app/shared/lib/posthog.ts`:

```typescript
import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === 'undefined') return
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_url: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,
    person_profiles: 'identified_only',
  })
  initialized = true
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, properties)
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, properties)
}
```

- [ ] **Step 3: Init PostHog in root route**

Modify `app/routes/__root.tsx` — add PostHog init in the `RootDocument` component:

```typescript
import { useEffect } from 'react'
import { initPostHog } from '#/shared/lib/posthog'

// Inside RootDocument:
function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    // ... existing JSX
  )
}
```

- [ ] **Step 4: Add event tracking to login page**

Modify `app/routes/_auth.login.tsx` — add PostHog capture:

```typescript
import { captureEvent, identifyUser } from '#/shared/lib/posthog'

// In handleSubmit, before calling loginFn:
const startTime = Date.now()
captureEvent('auth_login_started')

// After successful login:
captureEvent('auth_login_completed', {
  duration_ms: Date.now() - startTime,
  user_id: result.user.id,
})
identifyUser(result.user.id, {
  email: result.user.email,
  name: result.user.name,
  role: result.user.roleName,
})
```

- [ ] **Step 5: Update .env.example**

Add to `.env.example`:

```
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add app/shared/lib/posthog.ts app/shared/config/env.ts app/routes/__root.tsx app/routes/_auth.login.tsx .env.example
git commit -m "feat(analytics): add PostHog event tracking for login flow"
```


## Task 10: End-to-End Verification + Docker Build

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

```bash
cd /srv/apps/mono/dev-spaces && npx tsc --noEmit
```

Expected: exits 0, zero errors.

- [ ] **Step 2: Dev server smoke test**

```bash
pnpm dev
```

Test flow:
1. Visit `http://localhost:3000/` → redirect to `/login`
2. Login with `admin@devspace.local` / `DevSpace2026!`
3. Redirect to dashboard
4. Navigate to Projects → see empty list
5. Create project → appears in list
6. Click logout → redirect to `/login`

- [ ] **Step 3: Verify PostHog events (if key configured)**

If `VITE_POSTHOG_KEY` is set, check PostHog dashboard for:
- `auth_login_started`
- `auth_login_completed` with `duration_ms` property

If not configured, skip — events are silently no-op.

- [ ] **Step 4: Docker build test**

```bash
cd /srv/apps/mono/dev-spaces
docker compose -p dev-spaces --env-file /srv/docker/compose/.env.dev-spaces \
  -f /srv/docker/compose/dev-spaces.yml build
```

Expected: build completes without errors.

- [ ] **Step 5: Docker run test**

```bash
docker compose -p dev-spaces --env-file /srv/docker/compose/.env-dev-spaces \
  -f /srv/docker/compose/dev-spaces.yml up -d
```

Check:
```bash
docker logs dev-spaces-app --tail 20
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

Expected: logs show "DevSpace listening on http://0.0.0.0:3000", curl returns 200.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: sprint-1 verification — auth, rbac, projects end-to-end"
```

---

## Summary

| Task | Description | Est (h) |
|------|-------------|---------|
| 1 | Install dependencies | 0.5 |
| 2 | DB client + schema + migration | 1.5 |
| 3 | Seed script | 0.5 |
| 4 | Auth domain (session + service + repo) | 2.5 |
| 5 | Auth server functions + login page | 1.5 |
| 6 | Route protection guards | 1.0 |
| 7 | RBAC permission checker | 1.5 |
| 8 | Project CRUD + UI | 2.5 |
| 9 | PostHog integration | 1.0 |
| 10 | E2E verification + Docker build | 0.5 |
| **Total** | | **13.0** |

## Definition of Done Checklist

- [ ] Login dengan email/password berhasil → redirect ke dashboard
- [ ] Logout berhasil → redirect ke /login
- [ ] Akses /dashboard tanpa login → redirect ke /login
- [ ] Akses /login saat sudah login → redirect ke /dashboard
- [ ] Admin bisa melihat list projects
- [ ] Admin bisa create project
- [ ] PostHog menerima event `auth_login_completed` dengan `duration_ms`
- [ ] Login → pilih project < 90 detik (manual test)
- [ ] Docker build + run tidak error
- [ ] `npx tsc --noEmit` lulus tanpa error

<!-- END_PLAN -->
