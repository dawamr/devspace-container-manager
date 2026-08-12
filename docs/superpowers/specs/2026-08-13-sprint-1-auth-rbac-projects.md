# Sprint 1 — Auth, RBAC, Projects: Design Spec

> **Status:** Draft for review
> **Sprint:** 1 (Foundation)
> **Estimate:** 13 jam
> **Hypothesis:** User baru bisa login + pilih project + environment dalam < 90 detik tanpa error

---

## 1. Context

### 1.1 Current State

DevSpace scaffold selesai. Yang sudah ada:

- TanStack Start v1.168.42 (SSR), React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (new-york style)
- File-based routing dengan pathless layouts: `_auth.*` (login), `_dashboard.*` (dashboard, projects, infrastructure, administration)
- UI shell: `DashboardShell` (CasaOS glassmorphism), `AuthLayout`, `AppHeader`, `casa-widgets` (Clock, Gauge, Storage, Network, GlassAppTile)
- Login page stub (`_auth.login.tsx`) — UI saja, no auth logic
- Module folders: `app/modules/{auth,projects,rbac,users}/{domain,infrastructure,presentation}/` (semua `.gitkeep`)
- DB schema kosong (`app/shared/db/schema/index.ts` → `export {}`)
- `drizzle-orm` belum terinstall (hanya `drizzle-kit` di devDeps)
- PostgreSQL via Patroni HA (port 5002, DB `devspace` kosong)
- Portainer CE running (port 7004, API key sudah di `.env`)
- Docker compose + Makefile + Dockerfile ready

### 1.2 Yang Belum Ada

- Drizzle ORM runtime dependency
- DB schema (users, roles, permissions, role_permissions, projects, project_members, sessions)
- Session management (login, logout, session validation)
- Password hashing (bcrypt)
- Route protection (unauthenticated users redirected to `/login`)
- RBAC middleware/checker
- Project CRUD (server functions + UI)
- PostHog integration

---

## 2. Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Auth strategy | Custom cookie session (DB-based, bcrypt, `sessions` table) | Full control, cocok TanStack Start server functions, no external auth library dependency |
| D2 | Session storage | DB session table (`sessions` — revocation instan, audit trail) | Consistent dengan spec Projects.md yang sudah list `sessions` table |
| D3 | RBAC schema | Full normalized (roles + permissions + role_permissions) | Sesuai spec Projects.md section 14, schema siap evolve untuk granular permission |
| D4 | Schema file org | Split per module + barrel export (`schema/auth.ts`, `schema/rbac.ts`, `schema/projects.ts`) | Cocok dengan domain module structure, modular |
| D5 | Password hashing | `bcrypt` (Node.js `crypto.scrypt` fallback) | bcrypt industry standard, scrypt built-in jika tidak mau add dep |
| D6 | Session transport | httpOnly cookie, signed, SameSite=Lax, Secure (production) | Standard security practice |
| D7 | PostHog | Client-side init + server-side event capture | Client untuk funnel tracking, server untuk audit-grade events |

---

## 3. Architecture

### 3.1 Auth Flow

```
Browser                    TanStack Start Server              PostgreSQL
   │                              │                               │
   ├─ POST /login ──────────────► │                               │
   │   { email, password }        │                               │
   │                              ├─ verifyPassword(email, pw) ──►│
   │                              │◄─ user record + hash ─────────┤
   │                              │                               │
   │                              ├─ bcrypt.compare(pw, hash)     │
   │                              ├─ createSession(userId) ──────►│
   │                              │◄─ sessionId ─────────────────┤
   │                              │                               │
   │◄─ Set-Cookie: sid=... ──────┤                               │
   │   (httpOnly, signed)         │                               │
   │                              │                               │
   ├─ GET /dashboard ───────────► │                               │
   │                              ├─ getSessionFromCookie ───────►│
   │                              │◄─ session + user ─────────────┤
   │◄─ 200 (rendered) ───────────┤                               │
   │                              │                               │
   ├─ POST /logout ─────────────► │                               │
   │                              ├─ deleteSession(sessionId) ───►│
   │◄─ Clear cookie + redirect ──┤                               │
```

### 3.2 Session Implementation

```
Cookie name: devspace_sid
Cookie value: <sessionId>.<hmac_signature>
Cookie attrs: httpOnly, SameSite=Lax, Secure=(NODE_ENV=production), Path=/
Session TTL: 7 days (sliding — renewed on each request)
Cleanup: expired sessions deleted lazily on getSession()
```

### 3.3 RBAC Check Flow

```
Request → Server Function
  → getSessionFromCookie()
  → getUserFromSession()
  → checkPermission(user, resource, action)
    → SELECT 1 FROM role_permissions
       JOIN roles ON roles.id = role_permissions.role_id
       WHERE roles.name = user.role
       AND role_permissions.resource = ?
       AND role_permissions.action = ?
  → allow / deny (throw 403)
```

### 3.4 Server Function Pattern

```typescript
// app/modules/auth/server/login.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const login = createServerFn('POST', async (data) => {
  const { email, password } = loginInput.parse(data)
  const user = await verifyUser(email, password)
  if (!user) throw new Error('Invalid credentials')

  const session = await createSession(user.id)
  setSessionCookie(session.id)

  return { success: true, user: { id: user.id, name: user.name, role: user.role } }
})
```

---

## 4. Database Schema

### 4.1 Schema Files

```
app/shared/db/
├── schema/
│   ├── index.ts          # barrel export
│   ├── auth.ts           # users, sessions
│   ├── rbac.ts           # roles, permissions, role_permissions
│   └── projects.ts       # projects, project_members, environments
├── client.ts             # drizzle instance (singleton)
└── migrations/           # generated by drizzle-kit
```

### 4.2 Tables

#### users (`schema/auth.ts`)

```typescript
users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### sessions (`schema/auth.ts`)

```typescript
sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### roles (`schema/rbac.ts`)

```typescript
roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),  // 'admin', 'developer', 'viewer'
  description: varchar('description', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### permissions (`schema/rbac.ts`)

```typescript
permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  resource: varchar('resource', { length: 50 }).notNull(),  // 'users', 'projects', 'environments', 'stacks', 'containers', 'logs'
  action: varchar('action', { length: 20 }).notNull(),      // 'create', 'read', 'update', 'delete'
  description: varchar('description', { length: 200 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### role_permissions (`schema/rbac.ts`)

```typescript
role_permissions = pgTable('role_permissions', {
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}))
```

#### projects (`schema/projects.ts`)

```typescript
projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdById: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### project_members (`schema/projects.ts`)

```typescript
project_members = pgTable('project_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueMembership: unique().on(t.projectId, t.userId),
}))
```

### 4.3 Seed Data

**Roles:**
- `admin` — Full access
- `developer` — Infrastructure ops, no user admin
- `viewer` — Read-only

**Permission matrix (role_permissions seed):**

| Resource | Admin | Developer | Viewer |
|----------|-------|-----------|--------|
| users | CRUD | — | — |
| projects | CRUD | Read | Read |
| environments | CRUD | Read | Read |
| stacks | CRUD | CRUD | Read |
| containers | CRUD | CRUD | Read |
| logs | Read | Read | Read |

**Admin user:**
- Email: `admin@devspace.local`
- Password: generated at seed time, printed to console
- Role: `admin`

---

## 5. Module Structure

```
app/modules/
├── auth/
│   ├── domain/
│   │   ├── auth-service.ts          # login, logout, verifyPassword, createSession
│   │   └── session.ts               # cookie get/set, HMAC sign/verify
│   ├── infrastructure/
│   │   └── user-repository.ts       # DB queries for users + sessions
│   ├── presentation/
│   │   └── (login route already exists)
│   └── server/
│       ├── login.ts                 # createServerFn('POST', login)
│       ├── logout.ts                # createServerFn('POST', logout)
│       └── get-current-user.ts      # createServerFn('GET', getCurrentUser)
├── rbac/
│   ├── domain/
│   │   ├── permission-service.ts    # checkPermission(user, resource, action)
│   │   └── role-constants.ts        # ROLE_NAMES, RESOURCES, ACTIONS
│   ├── infrastructure/
│   │   └── permission-repository.ts # DB queries for role_permissions
│   └── server/
│       └── check-permission.ts      # createServerFn guard helper
├── projects/
│   ├── domain/
│   │   └── project-service.ts       # CRUD logic + validation
│   ├── infrastructure/
│   │   └── project-repository.ts    # DB queries for projects + members
│   ├── presentation/
│   │   └── (project route files)
│   └── server/
│       ├── create-project.ts
│       ├── list-projects.ts
│       ├── get-project.ts
│       ├── update-project.ts
│       └── delete-project.ts
└── users/
    ├── domain/
    │   └── user-service.ts          # createUser, listUsers, updateUser
    ├── infrastructure/
    │   └── user-repository.ts       # DB queries for users
    └── server/
        └── (user management server fns — minimal for Sprint 1)
```

---

## 6. Server Functions API

### 6.1 Auth

| Function | Method | Input | Output | Auth Required |
|----------|--------|-------|--------|---------------|
| `login` | POST | `{ email, password }` | `{ success, user: { id, name, email, role } }` | No |
| `logout` | POST | — | `{ success }` | Yes |
| `getCurrentUser` | GET | — | `{ id, name, email, role } \| null` | No (returns null if not logged in) |

### 6.2 Projects

| Function | Method | Input | Output | Permission |
|----------|--------|-------|--------|------------|
| `listProjects` | GET | — | `Project[]` | projects:read |
| `getProject` | GET | `{ id }` | `Project \| null` | projects:read |
| `createProject` | POST | `{ name, description }` | `Project` | projects:create |
| `updateProject` | POST | `{ id, name?, description? }` | `Project` | projects:update |
| `deleteProject` | POST | `{ id }` | `{ success }` | projects:delete |

### 6.3 Users (minimal — admin only)

| Function | Method | Input | Output | Permission |
|----------|--------|-------|--------|------------|
| `listUsers` | GET | — | `User[]` (without passwordHash) | users:read |

---

## 7. Route Protection

### 7.1 BeforeLoad Guard Pattern

```typescript
// app/routes/_dashboard.tsx
export const Route = createFileRoute('/_dashboard')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user }  // available in all child routes via useRouteContext
  },
  component: DashboardLayoutRoute,
})
```

### 7.2 Auth Redirect (already logged in → redirect to dashboard)

```typescript
// app/routes/_auth.tsx
export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayoutRoute,
})
```

### 7.3 Route-Level Permission Check

```typescript
// app/routes/_dashboard.administration.users.tsx
export const Route = createFileRoute('/_dashboard/administration/users')({
  beforeLoad: async ({ context }) => {
    const hasPermission = await checkPermission('users', 'read')
    if (!hasPermission) {
      throw redirect({ to: '/' })  // or render 403 page
    }
  },
})
```

---

## 8. PostHog Integration

### 8.1 Setup

```typescript
// app/shared/lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_url: import.meta.env.VITE_POSTHOG_HOST,
      capture_pageview: false,  // manual capture
    })
  }
}
```

### 8.2 Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `auth_login_started` | User clicks "Masuk" | — |
| `auth_login_completed` | Login server fn returns success | `duration_ms`, `user_id` |
| `auth_login_failed` | Login fails | `duration_ms`, `error` |
| `project_selected` | User navigates to project detail | `project_id`, `project_name` |

### 8.3 Duration Tracking

```typescript
// In login page component
const startTime = Date.now()
// ... on submit
posthog.capture('auth_login_started')
const result = await login({ email, password })
if (result.success) {
  posthog.capture('auth_login_completed', {
    duration_ms: Date.now() - startTime,
    user_id: result.user.id,
  })
}
```

---

## 9. Dependencies to Install

| Package | Type | Purpose |
|---------|------|---------|
| `drizzle-orm` | dependencies | ORM runtime |
| `postgres` | dependencies | PostgreSQL driver (pg-light, pooled) |
| `bcryptjs` | dependencies | Password hashing |
| `posthog-js` | dependencies | Client-side analytics |

```bash
pnpm add drizzle-orm postgres bcryptjs posthog-js
```

---

## 10. Task Breakdown (Implementation Order)

### Task 1: Install Dependencies + DB Client (0.5h)

- Install `drizzle-orm`, `postgres`, `bcryptjs`, `posthog-js`
- Create `app/shared/db/client.ts` — drizzle singleton
- Verify connection to PostgreSQL

### Task 2: Schema + Migration (1.5h)

- Create `schema/auth.ts`, `schema/rbac.ts`, `schema/projects.ts`
- Barrel export in `schema/index.ts`
- Run `drizzle-kit generate` → create migration
- Run `drizzle-kit migrate` → apply to DB
- Verify tables exist

### Task 3: Seed Script (0.5h)

- Create `app/shared/db/seed.ts`
- Seed roles (admin, developer, viewer)
- Seed permissions (all resource × action combos)
- Seed role_permissions (per matrix in section 4.3)
- Seed admin user
- Print admin credentials to console

### Task 4: Auth Domain + Server Functions (2.5h)

- `auth/domain/session.ts` — cookie get/set, HMAC sign/verify
- `auth/domain/auth-service.ts` — login, logout, verifyPassword, createSession, deleteSession
- `auth/infrastructure/user-repository.ts` — DB queries
- `auth/server/login.ts`, `logout.ts`, `get-current-user.ts`
- Wire login page to server functions

### Task 5: Route Protection (1.5h)

- `_dashboard.tsx` beforeLoad guard → redirect to /login
- `_auth.tsx` beforeLoad → redirect to / if logged in
- Route context: pass `user` to child routes

### Task 6: RBAC Domain + Permission Checker (1.5h)

- `rbac/domain/permission-service.ts` — checkPermission
- `rbac/infrastructure/permission-repository.ts` — DB queries
- `rbac/server/check-permission.ts` — server fn guard
- Apply to admin-only routes (users page)

### Task 7: Project CRUD (2.5h)

- `projects/domain/project-service.ts` — CRUD + Zod validation
- `projects/infrastructure/project-repository.ts` — DB queries
- `projects/server/*.ts` — 5 server functions
- Wire `_dashboard.projects.tsx` to list projects
- Basic create project dialog/form

### Task 8: PostHog Integration (1h)

- `app/shared/lib/posthog.ts` — init
- Call init in root route
- Capture login events in login page
- Capture project_selected in project detail

### Task 9: Login Page → Real Auth (1h)

- Replace stub login with real server function call
- Error handling (invalid credentials)
- Loading state
- Redirect to dashboard on success
- Logout button in AppHeader

**Total: ~12.5 jam** (buffer 0.5h untuk debugging)

---

## 11. Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | TanStack Start server function API berubah antar version | Med | Pin version, test sebelum commit |
| R2 | Cookie signing di SSR context tricky | Med | Test di production Docker build, bukan hanya dev |
| R3 | bcryptjs performance di serverless | Low | Internal project, traffic rendah, acceptable |
| R4 | Drizzle migration conflict dengan existing (empty) DB | Low | DB kosong, fresh migration |
| R5 | PostHog env var belum ada | Low | Optional — guard dengan `if (VITE_POSTHOG_KEY)` |

---

## 12. Definition of Done

- [ ] Login dengan email/password berhasil → redirect ke dashboard
- [ ] Logout berhasil → redirect ke /login
- [ ] Akses /dashboard tanpa login → redirect ke /login
- [ ] Akses /login saat sudah login → redirect ke /dashboard
- [ ] Admin bisa melihat list users (Viewer/Developer tidak bisa)
- [ ] Admin/Developer/Viewer bisa melihat list projects
- [ ] Admin bisa create project
- [ ] PostHog menerima event `auth_login_completed` dengan `duration_ms`
- [ ] PostHog menerima event `project_selected`
- [ ] Login → pilih project < 90 detik (manual test)
- [ ] Docker build + run tidak error

---

## 13. Out of Scope (Deferred)

- User management UI (create/update/delete user dari UI) — Sprint 2+
- Environment CRUD — Sprint 2
- Container/Stack management — Sprint 2-3
- Password reset flow — later
- Email verification — later
- Session revocation UI — later
- Rate limiting — later
- CSRF token — TanStack Start handles via same-origin server functions
