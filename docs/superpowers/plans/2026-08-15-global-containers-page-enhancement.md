# Global Containers Page Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the global `/containers` page with view-mode toggle (table/grid/list), controls (search, filter, bulk actions, group-by, column visibility), and detail drawer — re-implementing features from the env-specific containers page.

**Architecture:** Expand `container_registry` schema with 4 new columns (status, health, ports, dockerCreatedAt) to bridge the data gap between DB-backed global listing and live Docker API env listing. Re-use existing presentation components (ContainerTable, ContainerSummaryBar, ContainerBulkToolbar, ContainerDetailDrawer) with optional global-mode props. Add 5 new presentation components for grid view, list view, view toggle, group control, and column visibility toggle. Full rewrite of the route to compose all components.

**Tech Stack:** TanStack Start, React, TanStack Table, TanStack Query, Drizzle ORM, PostgreSQL, Tailwind CSS, shadcn/ui, Lucide icons

**Spec:** `docs/superpowers/specs/2026-08-15-global-containers-page-enhancement-design.md`

---

## File Structure

```
app/
├── shared/db/schema/
│   └── container-registry.ts              [MODIFIED] +4 columns
├── modules/docker/
│   ├── infrastructure/
│   │   └── container-registry-repository.ts [MODIFIED] upsert + new fields
│   ├── server/
│   │   ├── sync-container-registry.ts     [MODIFIED] extract status/health/ports/createdAt
│   │   ├── list-all-containers.ts          [MODIFIED] return GlobalContainerSummary extends ContainerSummary
│   │   └── list-environments-map.ts        [NEW] environments lookup for global page
│   ├── domain/
│   │   └── docker-types.ts                [MODIFIED] export normalizeHealth/mapPorts
│   └── presentation/
│       ├── container-table.tsx             [MODIFIED] +isGlobal/+environments/+viewMode props
│       ├── container-grid-card.tsx         [NEW] grid card component
│       ├── container-list-row.tsx          [NEW] compact list row component
│       ├── container-view-toggle.tsx       [NEW] segmented control table/grid/list
│       ├── container-group-control.tsx     [NEW] group-by dropdown
│       ├── container-column-toggle.tsx     [NEW] column visibility popover
│       ├── container-summary-bar.tsx       [UNCHANGED]
│       ├── container-bulk-toolbar.tsx     [UNCHANGED]
│       ├── container-detail-drawer.tsx     [UNCHANGED]
│       └── container-health-badge.tsx      [UNCHANGED]
├── routes/
│   └── _dashboard.containers.tsx          [MODIFIED] full rewrite
└── drizzle/                                [NEW MIGRATION]
```

---

### Task 1: Export normalizeHealth and mapPorts from docker-types.ts

**Files:**
- Modify: `app/modules/docker/domain/docker-types.ts`

These functions already exist as local functions inside `docker-types.ts` but are not exported. They need to be exported so `sync-container-registry.ts` can import and reuse them.

- [ ] **Step 1: Read current docker-types.ts to find the functions**

Run: `cat app/modules/docker/domain/docker-types.ts`

Find `function normalizeHealth` and `function mapPorts` — they should be near the bottom of the file, before `mapContainerInfo`.

- [ ] **Step 2: Add export keyword to both functions**

In `app/modules/docker/domain/docker-types.ts`, change:

```typescript
function normalizeHealth(status: string): ContainerHealth {
```
to:
```typescript
export function normalizeHealth(status: string): ContainerHealth {
```

And change:
```typescript
function mapPorts(ports: Docker.Port[]): string[] {
```
to:
```typescript
export function mapPorts(ports: Docker.Port[]): string[] {
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors (only pre-existing errors if any).

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/domain/docker-types.ts
git commit -m "refactor: export normalizeHealth and mapPorts from docker-types"
```

---

### Task 2: Expand container_registry schema

**Files:**
- Modify: `app/shared/db/schema/container-registry.ts`

Add 4 new columns to the `containerRegistry` table definition.

- [ ] **Step 1: Read current schema**

Run: `cat app/shared/db/schema/container-registry.ts`

- [ ] **Step 2: Add jsonb import and new columns**

In `app/shared/db/schema/container-registry.ts`, update the import and add new columns:

```typescript
import { pgTable, uuid, varchar, boolean, timestamp, jsonb, unique } from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { projects } from './projects'

export const containerRegistry = pgTable(
  'container_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    containerId: varchar('container_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    image: varchar('image', { length: 255 }).notNull(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    stackName: varchar('stack_name', { length: 255 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    // NEW: enriched fields from Docker API, synced during registry sync
    status: varchar('status', { length: 255 }),
    health: varchar('health', { length: 20 }).default('none').notNull(),
    ports: jsonb('ports').default([]).notNull(),
    dockerCreatedAt: timestamp('docker_created_at', { withTimezone: true }),
  },
  (t) => [unique().on(t.containerId, t.environmentId)],
)
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/shared/db/schema/container-registry.ts
git commit -m "feat: expand container_registry schema with status, health, ports, dockerCreatedAt"
```

---

### Task 3: Generate and apply database migration

**Files:**
- Create: `drizzle/<timestamp>_expanding_container_registry.sql` (auto-generated)

- [ ] **Step 1: Generate migration**

Run: `pnpm db:generate`

Expected: Drizzle Kit detects schema changes and creates a new SQL migration file in `drizzle/` directory. The SQL should contain `ALTER TABLE container_registry ADD COLUMN ...` statements for the 4 new columns.

- [ ] **Step 2: Review generated migration SQL**

Run: `cat drizzle/*expanding*.sql` (or whatever filename was generated)

Verify the SQL includes:
- `ADD COLUMN status varchar(255)`
- `ADD COLUMN health varchar(20) DEFAULT 'none' NOT NULL`
- `ADD COLUMN ports jsonb DEFAULT '[]' NOT NULL`
- `ADD COLUMN docker_created_at timestamp with time zone`

- [ ] **Step 3: Apply migration**

Run: `pnpm db:migrate`

Expected: Migration applied successfully.

- [ ] **Step 4: Verify columns exist in DB**

Run via psql or your DB client:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'container_registry'
ORDER BY ordinal_position;
```

Expected: 4 new columns present (status, health, ports, docker_created_at).

- [ ] **Step 5: Commit migration files**

```bash
git add drizzle/
git commit -m "feat: add migration for container_registry schema expansion"
```

### Task 4: Update upsertContainer in repository

**Files:**
- Modify: `app/modules/docker/infrastructure/container-registry-repository.ts`

Add the 4 new fields to the `upsertContainer` function so they are written to DB during sync.

- [ ] **Step 1: Read current repository file**

Run: `cat app/modules/docker/infrastructure/container-registry-repository.ts`

Find the `upsertContainer` function and its `ContainerRegistryInsert` type.

- [ ] **Step 2: Update upsertContainer to handle new fields**

The `upsertContainer` function already takes `ContainerRegistryInsert` which now includes the 4 new fields (from the schema change in Task 2). The upsert `ON CONFLICT` update clause needs to include the new fields so they get refreshed on every sync.

Find the upsert query and add the new fields to the `.set()` / update-on-conflict portion. The exact code depends on the current implementation, but it should look like:

```typescript
export async function upsertContainer(data: ContainerRegistryInsert): Promise<void> {
  await db
    .insert(containerRegistry)
    .values(data)
    .onConflictDoUpdate({
      target: [containerRegistry.containerId, containerRegistry.environmentId],
      set: {
        name: data.name,
        image: data.image,
        stackName: data.stackName,
        isActive: data.isActive,
        lastSeenAt: new Date(),
        // NEW: enriched fields
        status: data.status,
        health: data.health,
        ports: data.ports,
        dockerCreatedAt: data.dockerCreatedAt,
      },
    })
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors. If errors about `data.status` being possibly undefined, the insert type should allow it (column is nullable).

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/infrastructure/container-registry-repository.ts
git commit -m "feat: update upsertContainer to persist status, health, ports, dockerCreatedAt"
```

---

### Task 5: Update syncContainerRegistry to extract new fields

**Files:**
- Modify: `app/modules/docker/server/sync-container-registry.ts`

During the sync loop, extract `status`, `health`, `ports`, `dockerCreatedAt` from the Docker API response and pass them to `upsertContainer`.

- [ ] **Step 1: Add imports for normalizeHealth and mapPorts**

At the top of `app/modules/docker/server/sync-container-registry.ts`, add:

```typescript
import { normalizeHealth, mapPorts } from '../domain/docker-types'
```

- [ ] **Step 2: Update the upsertContainer call inside the sync loop**

Find the `upsertContainer` call inside the `for (const c of containers)` loop (around line 45). Update it to include the new fields:

```typescript
await upsertContainer({
  containerId: c.Id,
  name: (c.Names?.[0] ?? '').replace(/^\//, ''),
  image: c.Image,
  environmentId: env.id,
  projectId: env.projectId,
  stackName: c.Labels?.['com.docker.compose.project'] ?? null,
  isActive: true,
  // NEW: enriched fields from Docker API
  status: c.Status,
  health: normalizeHealth(c.Status ?? ''),
  ports: mapPorts(c.Ports),
  dockerCreatedAt: new Date(c.Created * 1000),
})
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/server/sync-container-registry.ts
git commit -m "feat: sync enriched container fields (status, health, ports, createdAt) to registry"
```

---

### Task 6: Unify GlobalContainerSummary and update listAllContainersFn

**Files:**
- Modify: `app/modules/docker/server/list-all-containers.ts`

Change `GlobalContainerSummary` to extend `ContainerSummary`, and update the mapping to include all fields.

- [ ] **Step 1: Read current file**

Run: `cat app/modules/docker/server/list-all-containers.ts`

- [ ] **Step 2: Update imports and interface**

Replace the current `GlobalContainerSummary` interface with:

```typescript
import { normalizeHealth, type ContainerHealth } from '../domain/docker-types'

export interface GlobalContainerSummary {
  id: string
  name: string
  image: string
  state: 'running' | 'exited'
  health: ContainerHealth
  status: string
  createdAt: string
  ports: string[]
  stackName: string | null
  environmentId: string
  projectId: string
  isActive: boolean
  lastSeenAt: string
}
```

Note: We don't use `extends ContainerSummary` here because `state` in `ContainerSummary` has a wider union type. Instead, we make `GlobalContainerSummary` structurally compatible — all `ContainerSummary` fields are present with compatible types. The `state` field is narrowed to `'running' | 'exited'` which is a subset of `ContainerSummary['state']`. This is safe for consumers that expect `ContainerSummary`.

- [ ] **Step 3: Update the return mapping**

Replace the `return rows.map(...)` block:

```typescript
return rows.map((r) => ({
  id: r.containerId,
  name: r.name,
  image: r.image,
  state: r.isActive ? 'running' as const : 'exited' as const,
  health: (r.health ?? 'none') as ContainerHealth,
  status: r.status ?? '',
  createdAt: r.dockerCreatedAt?.toISOString() ?? r.lastSeenAt.toISOString(),
  ports: (r.ports ?? []) as string[],
  stackName: r.stackName,
  environmentId: r.environmentId,
  projectId: r.projectId,
  isActive: r.isActive,
  lastSeenAt: r.lastSeenAt.toISOString(),
}))
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add app/modules/docker/server/list-all-containers.ts
git commit -m "feat: unify GlobalContainerSummary with ContainerSummary fields"
```

### Task 7: Create listEnvironmentsMapFn server function

**Files:**
- Create: `app/modules/docker/server/list-environments-map.ts`

New server function that returns a lookup map of environmentId → { environmentName, projectId, projectName } for the global containers page.

- [ ] **Step 1: Create the file**

Create `app/modules/docker/server/list-environments-map.ts`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { inArray } from 'drizzle-orm'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findAccessibleProjectIds } from '#/modules/projects/server/accessible-projects'
import { findEnvironmentsByProjectIds } from '#/modules/environments/infrastructure/environment-repository'
import { db } from '#/shared/db/client'
import { projects as projectsTable } from '#/shared/db/schema'

export interface EnvironmentMapEntry {
  environmentId: string
  environmentName: string
  projectId: string
  projectName: string
}

export const listEnvironmentsMapFn = createServerFn({ method: 'GET' })
  .validator(z.object({}).optional())
  .handler(async (): Promise<EnvironmentMapEntry[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const projectIds = await findAccessibleProjectIds()
    if (projectIds.length === 0) return []

    const environments = await findEnvironmentsByProjectIds(projectIds)
    if (environments.length === 0) return []

    // Batch fetch project names
    const uniqueProjectIds = [...new Set(environments.map((e) => e.projectId))]
    const projects = await db
      .select({ id: projectsTable.id, name: projectsTable.name })
      .from(projectsTable)
      .where(inArray(projectsTable.id, uniqueProjectIds))

    const projectMap = new Map(projects.map((p) => [p.id, p.name]))

    return environments.map((e) => ({
      environmentId: e.id,
      environmentName: e.name,
      projectId: e.projectId,
      projectName: projectMap.get(e.projectId) ?? 'Unknown',
    }))
  })
```

- [ ] **Step 2: Verify the imports resolve**

Check that `findEnvironmentsByProjectIds` is exported from `app/modules/environments/infrastructure/environment-repository.ts`:

Run: `grep -n 'export.*findEnvironmentsByProjectIds' app/modules/environments/infrastructure/environment-repository.ts`

Expected: A matching export line.

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/server/list-environments-map.ts
git commit -m "feat: add listEnvironmentsMapFn for global containers page"
```

---

### Task 8: Create ContainerViewToggle component

**Files:**
- Create: `app/modules/docker/presentation/container-view-toggle.tsx`

Segmented control with 3 icons (Table, Grid, List) for view mode switching.

- [ ] **Step 1: Create the component**

Create `app/modules/docker/presentation/container-view-toggle.tsx`:

```typescript
import { Table, LayoutGrid, List } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type ViewMode = 'table' | 'grid' | 'list'

interface ContainerViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

const MODES: { key: ViewMode; label: string; icon: typeof Table }[] = [
  { key: 'table', label: 'Table', icon: Table },
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
]

export function ContainerViewToggle({ value, onChange }: ContainerViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-0.5 backdrop-blur-[var(--glass-blur)]">
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={`${label} view`}
          className={cn(
            'flex items-center gap-1.5 rounded-[calc(var(--glass-radius)-2px)] px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === key
              ? 'bg-white/10 text-white border border-[var(--glass-border-strong)]'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent',
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/presentation/container-view-toggle.tsx
git commit -m "feat: add ContainerViewToggle segmented control"
```

---

### Task 9: Create ContainerGroupControl component

**Files:**
- Create: `app/modules/docker/presentation/container-group-control.tsx`

Dropdown for selecting group-by mode.

- [ ] **Step 1: Create the component**

Create `app/modules/docker/presentation/container-group-control.tsx`:

```typescript
import { useState } from 'react'
import { Layers, ChevronDown } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type GroupBy = 'none' | 'environment' | 'project'

interface ContainerGroupControlProps {
  value: GroupBy
  onChange: (value: GroupBy) => void
}

const OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
]

export function ContainerGroupControl({ value, onChange }: ContainerGroupControlProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-white"
      >
        <Layers className="size-3.5" />
        <span className="hidden sm:inline">Group:</span>
        <span className="text-white">{OPTIONS.find((o) => o.key === value)?.label ?? 'None'}</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-1 backdrop-blur-[var(--glass-blur)] shadow-xl">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full rounded-[calc(var(--glass-radius)-2px)] px-3 py-1.5 text-left text-xs transition-colors',
                  value === opt.key
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/presentation/container-group-control.tsx
git commit -m "feat: add ContainerGroupControl dropdown"
```

---

### Task 10: Create ContainerColumnToggle component

**Files:**
- Create: `app/modules/docker/presentation/container-column-toggle.tsx`

Popover with checkbox list for toggling column visibility.

- [ ] **Step 1: Create the component**

Create `app/modules/docker/presentation/container-column-toggle.tsx`:

```typescript
import { useState } from 'react'
import { Settings2, ChevronDown } from 'lucide-react'
import { Checkbox } from '#/shared/ui/checkbox'
import { cn } from '#/shared/lib/cn'

export interface ColumnDef {
  key: string
  label: string
}

interface ContainerColumnToggleProps {
  columns: ColumnDef[]
  visibility: Record<string, boolean>
  onChange: (visibility: Record<string, boolean>) => void
}

export function ContainerColumnToggle({ columns, visibility, onChange }: ContainerColumnToggleProps) {
  const [open, setOpen] = useState(false)

  const toggleColumn = (key: string) => {
    onChange({ ...visibility, [key]: !visibility[key] })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-white"
      >
        <Settings2 className="size-3.5" />
        <span className="hidden sm:inline">Columns</span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-2 backdrop-blur-[var(--glass-blur)] shadow-xl">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
              Toggle Columns
            </div>
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--glass-radius)-2px)] px-2 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5"
              >
                <Checkbox
                  checked={visibility[col.key] !== false}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/presentation/container-column-toggle.tsx
git commit -m "feat: add ContainerColumnToggle popover"
```

### Task 11: Create ContainerGridCard component

**Files:**
- Create: `app/modules/docker/presentation/container-grid-card.tsx`

Card component for grid view mode — shows container info in a compact card with quick actions.

- [ ] **Step 1: Create the component**

Create `app/modules/docker/presentation/container-grid-card.tsx`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCw, Trash2, Loader2 } from 'lucide-react'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { HealthBadge } from './container-health-badge'

interface ContainerGridCardProps {
  container: ContainerSummary
  environmentId: string
  environmentName?: string
  projectName?: string
  onClick: () => void
}

const ACTION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-[var(--glass-radius)] border border-[var(--glass-border)] ' +
  'bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] p-1.5 text-white/70 ' +
  'hover:text-white hover:bg-white/10 hover:border-[var(--glass-border-strong)] ' +
  'disabled:opacity-30 disabled:pointer-events-none transition-colors'

const STATE_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  exited: 'bg-white/40',
  paused: 'bg-amber-400',
  restarting: 'bg-amber-400',
  dead: 'bg-red-400',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ContainerGridCard({
  container,
  environmentId,
  environmentName,
  projectName,
  onClick,
}: ContainerGridCardProps) {
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['all-containers'] })
  }

  const startMutation = useMutation({
    mutationFn: (containerId: string) => startContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`start-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const stopMutation = useMutation({
    mutationFn: (containerId: string) => stopContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`stop-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const restartMutation = useMutation({
    mutationFn: (containerId: string) => restartContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`restart-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const canStart = container.state === 'exited' || container.state === 'paused'
  const canStop = container.state === 'running' || container.state === 'paused'
  const canRestart = container.state === 'running'
  const locked = container.state === 'restarting' || container.state === 'dead'
  const isBusy = pendingAction !== null

  return (
    <div
      className="flex cursor-pointer flex-col gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-3 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', STATE_DOT[container.state] ?? 'bg-white/40')} />
          <span className="text-sm font-semibold text-white">{container.name}</span>
        </div>
        <HealthBadge health={container.health} />
      </div>

      <div className="truncate font-mono text-xs text-white/50">{container.image}</div>

      {(environmentName || projectName) && (
        <div className="text-[11px] text-white/40">
          {environmentName && <span>env: {environmentName}</span>}
          {environmentName && projectName && <span> · </span>}
          {projectName && <span>proj: {projectName}</span>}
        </div>
      )}

      {container.ports && container.ports.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {container.ports.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-[11px] text-white/40">Created: {formatDate(container.createdAt)}</div>

      <div className="flex items-center gap-1 border-t border-[var(--glass-border)] pt-2" onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <Loader2 className="size-4 animate-spin text-white/50" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Start" disabled={!canStart || locked} onClick={() => startMutation.mutate(container.id)}>
              <Play className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Stop" disabled={!canStop || locked} onClick={() => stopMutation.mutate(container.id)}>
              <Square className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Restart" disabled={!canRestart || locked} onClick={() => restartMutation.mutate(container.id)}>
              <RotateCw className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')} title="Remove" disabled={locked}>
              <Trash2 className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
```

Note: The remove button is a placeholder here — the remove confirmation dialog is handled at the route level. The route will pass an `onRemove` callback. Update the interface to include `onRemove?: (container: ContainerSummary) => void` and wire it when you compose the route in Task 14.

- [ ] **Step 2: Add missing import**

Add `import { useState } from 'react'` at the top of the file.

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/presentation/container-grid-card.tsx
git commit -m "feat: add ContainerGridCard component for grid view mode"
```

---

### Task 12: Create ContainerListRow component

**Files:**
- Create: `app/modules/docker/presentation/container-list-row.tsx`

Compact single-line row for list view mode.

- [ ] **Step 1: Create the component**

Create `app/modules/docker/presentation/container-list-row.tsx`:

```typescript
import { Play, Square, RotateCw, Trash2, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'
import { useState } from 'react'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'

interface ContainerListRowProps {
  container: ContainerSummary
  environmentId: string
  environmentName?: string
  projectName?: string
  onClick: () => void
}

const ACTION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-[var(--glass-radius)] border border-[var(--glass-border)] ' +
  'bg-[var(--glass-surface)] p-1 text-white/70 hover:text-white hover:bg-white/10 ' +
  'hover:border-[var(--glass-border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-colors'

const STATE_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  exited: 'bg-white/40',
  paused: 'bg-amber-400',
  restarting: 'bg-amber-400',
  dead: 'bg-red-400',
}

export function ContainerListRow({
  container,
  environmentId,
  environmentName,
  projectName,
  onClick,
}: ContainerListRowProps) {
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['all-containers'] })
  }

  const startMutation = useMutation({
    mutationFn: (containerId: string) => startContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`start-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const stopMutation = useMutation({
    mutationFn: (containerId: string) => stopContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`stop-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const restartMutation = useMutation({
    mutationFn: (containerId: string) => restartContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`restart-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const canStart = container.state === 'exited' || container.state === 'paused'
  const canStop = container.state === 'running' || container.state === 'paused'
  const canRestart = container.state === 'running'
  const locked = container.state === 'restarting' || container.state === 'dead'
  const isBusy = pendingAction !== null

  return (
    <div
      className="flex cursor-pointer items-center gap-3 border-b border-[var(--glass-border)] px-3 py-2 text-xs transition-colors hover:bg-white/5"
      onClick={onClick}
    >
      <span className={cn('size-2 shrink-0 rounded-full', STATE_DOT[container.state] ?? 'bg-white/40')} />
      <span className="shrink-0 font-medium text-white">{container.name}</span>
      <span className="hidden truncate font-mono text-white/40 md:inline">{container.image}</span>
      <span className="hidden shrink-0 capitalize text-white/60 lg:inline">{container.state}</span>
      {container.ports && container.ports.length > 0 && (
        <div className="hidden shrink-0 gap-1 lg:flex">
          {container.ports.slice(0, 3).map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      )}
      {environmentName && (
        <span className="ml-auto hidden shrink-0 text-white/40 lg:inline">
          {projectName ? `${projectName}/${environmentName}` : environmentName}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <Loader2 className="size-3.5 animate-spin text-white/50" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Start" disabled={!canStart || locked} onClick={() => startMutation.mutate(container.id)}>
              <Play className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Stop" disabled={!canStop || locked} onClick={() => stopMutation.mutate(container.id)}>
              <Square className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Restart" disabled={!canRestart || locked} onClick={() => restartMutation.mutate(container.id)}>
              <RotateCw className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')} title="Remove" disabled={locked}>
              <Trash2 className="size-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/presentation/container-list-row.tsx
git commit -m "feat: add ContainerListRow compact view component"
```

### Task 13: Adapt ContainerTable for global mode

**Files:**
- Modify: `app/modules/docker/presentation/container-table.tsx`

Add optional props `isGlobal`, `environments` to support Environment/Project columns when rendered in global mode. When `isGlobal` is falsy, behavior is unchanged.

- [ ] **Step 1: Update the ContainerTableProps interface**

In `app/modules/docker/presentation/container-table.tsx`, find the `ContainerTableProps` interface (around line 107) and add optional global props:

```typescript
interface ContainerTableProps {
  containers: ContainerSummary[]
  environmentId: string
  onOpenDetail: (container: ContainerSummary) => void
  onRefresh?: () => void
  // Global mode extensions (optional — env page passes none of these)
  isGlobal?: boolean
  environments?: Map<string, { name: string; projectName: string }>
}
```

- [ ] **Step 2: Add Environment and Project columns in global mode**

In the `useMemo` that builds `columns` (around line 320), add Environment and Project columns after the Name column, conditionally on `isGlobal`:

```typescript
const columns = useMemo<ColumnDef<ContainerSummary, any>[]>(() => {
  const baseColumns: ColumnDef<ContainerSummary, any>[] = [
    // ... select column (existing) ...
    // ... name column (existing) ...
  ]

  // Insert Environment and Project columns after name, only in global mode
  if (isGlobal) {
    baseColumns.push(
      columnHelper.accessor('environmentId', {
        header: ({ column }) => <SortHeader label="Environment" column={column} />,
        cell: (info) => {
          const env = environments?.get(info.getValue())
          return <span className="text-white/70">{env?.name ?? '—'}</span>
        },
        enableSorting: true,
      }),
      columnHelper.accessor('projectId', {
        header: ({ column }) => <SortHeader label="Project" column={column} />,
        cell: (info) => {
          const env = environments?.get(info.row.original.environmentId)
          return <span className="text-white/70">{env?.projectName ?? '—'}</span>
        },
        enableSorting: true,
      }),
    )
  }

  // ... rest of columns (state, status, createdAt, ports, actions) ...
  return baseColumns
}, [pendingId, startMutation, stopMutation, restartMutation, removeMutation, isGlobal, environments])
```

Note: The exact implementation depends on how the existing columns array is structured. The key points are:
1. Environment and Project columns appear after Name, before State
2. They use `environments` Map lookup
3. They are only included when `isGlobal` is true
4. The dependency array includes `isGlobal` and `environments`

- [ ] **Step 3: Destructure new props in the component function**

Find the `export function ContainerTable({ containers, environmentId, onOpenDetail, onRefresh }: ContainerTableProps)` line and update to:

```typescript
export function ContainerTable({
  containers,
  environmentId,
  onOpenDetail,
  onRefresh,
  isGlobal,
  environments,
}: ContainerTableProps) {
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors. Env page passes no new props — `isGlobal` is undefined (falsy), so behavior unchanged.

- [ ] **Step 5: Verify env page still works**

Visually check that the env-specific containers page renders the same as before (no Environment/Project columns):

Open `https://devspace.1dev.my.id/configuration/projects/f7fababf-6245-48ca-acbf-79a6bee96a2a/environments/b6eb10bf-ec82-4c3f-8d3a-d53e208e833d/containers` — table should look identical to before.

- [ ] **Step 6: Commit**

```bash
git add app/modules/docker/presentation/container-table.tsx
git commit -m "feat: add global mode props to ContainerTable (isGlobal, environments)"
```

---

### Task 14: Rewrite _dashboard.containers.tsx route

**Files:**
- Modify: `app/routes/_dashboard.containers.tsx`

Full rewrite of the global containers page to compose all components: summary bar, controls bar (search, group-by, column toggle, view toggle), bulk toolbar, table/grid/list views, detail drawer.

- [ ] **Step 1: Read current route file**

Run: `cat app/routes/_dashboard.containers.tsx`

- [ ] **Step 2: Write the new route file**

Replace the entire content of `app/routes/_dashboard.containers.tsx`:

```typescript
import { useState, useEffect, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Box, AlertTriangle, Loader2 } from 'lucide-react'

import { listAllContainersFn, type GlobalContainerSummary } from '#/modules/docker/server/list-all-containers'
import { listEnvironmentsMapFn, type EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { ContainerTable } from '#/modules/docker/presentation/container-table'
import { ContainerSummaryBar } from '#/modules/docker/presentation/container-summary-bar'
import { ContainerBulkToolbar } from '#/modules/docker/presentation/container-bulk-toolbar'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import { ContainerGridCard } from '#/modules/docker/presentation/container-grid-card'
import { ContainerListRow } from '#/modules/docker/presentation/container-list-row'
import { ContainerViewToggle, type ViewMode } from '#/modules/docker/presentation/container-view-toggle'
import { ContainerGroupControl, type GroupBy } from '#/modules/docker/presentation/container-group-control'
import { ContainerColumnToggle, type ColumnDef as ColDef } from '#/modules/docker/presentation/container-column-toggle'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { Trash2 } from 'lucide-react'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'

export const Route = createFileRoute('/_dashboard/containers')({
  component: ContainersPage,
})

const COLUMNS: ColDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
  { key: 'state', label: 'State' },
  { key: 'status', label: 'Status' },
  { key: 'ports', label: 'Ports' },
  { key: 'createdAt', label: 'Created' },
  { key: 'actions', label: 'Actions' },
]

function ContainersPage() {
  const queryClient = useQueryClient()

  // Data queries
  const { data: containers = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['all-containers'],
    queryFn: () => listAllContainersFn(),
  })

  const { data: envMap = [] } = useQuery({
    queryKey: ['environments-map'],
    queryFn: () => listEnvironmentsMapFn(),
  })

  // Build environments lookup Map
  const environments = useMemo(() => {
    const map = new Map<string, { name: string; projectName: string }>()
    for (const e of envMap) {
      map.set(e.environmentId, { name: e.environmentName, projectName: e.projectName })
    }
    return map
  }, [envMap])

  // View state (localStorage persisted)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [detailTarget, setDetailTarget] = useState<ContainerSummary | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<GlobalContainerSummary | null>(null)

  // Hydrate from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('devspace:containers:view-mode') as ViewMode | null
    if (savedView) setViewMode(savedView)
    const savedGroup = localStorage.getItem('devspace:containers:group-by') as GroupBy | null
    if (savedGroup) setGroupBy(savedGroup)
    const savedCols = localStorage.getItem('devspace:containers:columns')
    if (savedCols) setColumnVisibility(JSON.parse(savedCols))
  }, [])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('devspace:containers:view-mode', viewMode)
  }, [viewMode])
  useEffect(() => {
    localStorage.setItem('devspace:containers:group-by', groupBy)
  }, [groupBy])
  useEffect(() => {
    localStorage.setItem('devspace:containers:columns', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  // Filter containers by search
  const filteredContainers = useMemo(() => {
    if (!search) return containers
    const q = search.toLowerCase()
    return containers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.status ?? '').toLowerCase().includes(q),
    )
  }, [containers, search])

  // Group containers
  const groupedContainers = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', items: filteredContainers }]
    const groups = new Map<string, GlobalContainerSummary[]>()
    for (const c of filteredContainers) {
      const groupKey =
        groupBy === 'environment'
          ? environments.get(c.environmentId)?.name ?? 'Unknown'
          : environments.get(c.environmentId)?.projectName ?? 'Unknown'
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey)!.push(c)
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }))
  }, [filteredContainers, groupBy, environments])

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: (target: GlobalContainerSummary) =>
      removeContainerFn({ data: { environmentId: target.environmentId, containerId: target.id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-containers'] })
      setRemoveTarget(null)
    },
  })

  const openDetail = (container: ContainerSummary) => {
    setDetailTarget(container)
    setDrawerOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <ContainersHeader isFetching={false} onRefresh={() => refetch()} />
        <div className="flex items-center justify-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-sm text-white/50">
          <Loader2 className="size-4 animate-spin" />
          Loading containers…
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <ContainersHeader isFetching={isFetching} onRefresh={() => refetch()} />
        <div className="flex items-center gap-2 rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error instanceof Error ? error.message : 'Failed to load containers'}</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ContainersHeader isFetching={isFetching} onRefresh={() => refetch()} />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, image, state…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <ContainerGroupControl value={groupBy} onChange={setGroupBy} />
          <ContainerColumnToggle columns={COLUMNS} visibility={columnVisibility} onChange={setColumnVisibility} />
          <ContainerViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Summary bar */}
      <ContainerSummaryBar containers={containers} active="all" onChange={() => {}} />

      {/* Container views */}
      {filteredContainers.length === 0 ? (
        <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-12 text-center text-sm text-white/50">
          {containers.length === 0
            ? 'Belum ada container terdaftar. Container akan muncul setelah di-deploy ke environment.'
            : 'Tidak ada container yang cocok dengan filter.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedContainers.map((group) => (
            <div key={group.key || 'all'} className="flex flex-col gap-2">
              {group.key && (
                <div className="sticky top-0 z-10 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-[var(--glass-blur)]">
                  {group.key} ({group.items.length})
                </div>
              )}

              {viewMode === 'table' && (
                <ContainerTable
                  containers={group.items}
                  environmentId={group.items[0]?.environmentId ?? ''}
                  onOpenDetail={openDetail}
                  isGlobal
                  environments={environments}
                />
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((c) => (
                    <ContainerGridCard
                      key={c.id}
                      container={c}
                      environmentId={c.environmentId}
                      environmentName={environments.get(c.environmentId)?.name}
                      projectName={environments.get(c.environmentId)?.projectName}
                      onClick={() => openDetail(c)}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
                  {group.items.map((c) => (
                    <ContainerListRow
                      key={c.id}
                      container={c}
                      environmentId={c.environmentId}
                      environmentName={environments.get(c.environmentId)?.name}
                      projectName={environments.get(c.environmentId)?.projectName}
                      onClick={() => openDetail(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <ContainerDetailDrawer
        environmentId={detailTarget ? (detailTarget as GlobalContainerSummary).environmentId : ''}
        container={detailTarget}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus container</DialogTitle>
            <DialogDescription>
              Anda akan menghapus container{' '}
              <span className="font-semibold text-white">{removeTarget?.name}</span>.
              {removeTarget?.state === 'running'
                ? ' Container masih running — akan di-force remove.'
                : ''}{' '}
              Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => removeTarget && removeMutation.mutate(removeTarget)}
            >
              {removeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ContainersHeader({ isFetching, onRefresh }: { isFetching: boolean; onRefresh: () => void }) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Box className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Containers</h1>
          <p className="text-sm text-muted-foreground">
            Semua container lintas project &amp; environment
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
        <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </header>
  )
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors. If `ContainerSummaryBar` props don't match (it expects `active` and `onChange`), check the component interface — it takes `active: string` and `onChange: (value: string) => void`. The global page passes `active="all"` and a no-op `onChange` since filtering is handled by search. If you want the summary bar pills to actually filter, wire `onChange` to a state variable and filter containers accordingly.

- [ ] **Step 4: Run dev server and verify**

Run: `pnpm dev`

Open `https://devspace.1dev.my.id/containers`

Verify:
1. Page loads with containers listed in table view (default)
2. View toggle switches between table, grid, and list
3. Group-by dropdown groups containers by environment or project
4. Column toggle popover shows/hides columns
5. Search filters containers
6. Click container opens detail drawer
7. Refresh button works
8. Empty state shows when no containers
9. Error state shows on API failure

- [ ] **Step 5: Commit**

```bash
git add app/routes/_dashboard.containers.tsx
git commit -m "feat: rewrite global containers page with view modes, controls, and detail drawer"
```

### Task 15: Wire summary bar filter pills

**Files:**
- Modify: `app/routes/_dashboard.containers.tsx`

The `ContainerSummaryBar` has filter pills (Total/Running/Stopped/Unhealthy) that should actually filter the container list, not just be decorative.

- [ ] **Step 1: Add filter state**

In `ContainersPage` function, add a `statusFilter` state:

```typescript
const [statusFilter, setStatusFilter] = useState('all')
```

- [ ] **Step 2: Wire the summary bar**

Update the `ContainerSummaryBar` usage:

```typescript
<ContainerSummaryBar
  containers={containers}
  active={statusFilter}
  onChange={setStatusFilter}
/>
```

- [ ] **Step 3: Apply filter to filteredContainers**

Update the `filteredContainers` useMemo to also filter by status:

```typescript
const filteredContainers = useMemo(() => {
  let result = containers

  // Status filter
  if (statusFilter === 'running') {
    result = result.filter((c) => c.state === 'running')
  } else if (statusFilter === 'exited') {
    result = result.filter((c) => c.state === 'exited')
  } else if (statusFilter === 'unhealthy') {
    result = result.filter((c) => c.health === 'unhealthy')
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.status ?? '').toLowerCase().includes(q),
    )
  }

  return result
}, [containers, statusFilter, search])
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 5: Test filter pills**

Run: `pnpm dev`

Open `https://devspace.1dev.my.id/containers` — click Running, Stopped, Unhealthy pills. Verify container list filters correctly.

- [ ] **Step 6: Commit**

```bash
git add app/routes/_dashboard.containers.tsx
git commit -m "feat: wire summary bar filter pills to container list"
```

---

### Task 16: Wire remove action in grid and list views

**Files:**
- Modify: `app/modules/docker/presentation/container-grid-card.tsx`
- Modify: `app/modules/docker/presentation/container-list-row.tsx`
- Modify: `app/routes/_dashboard.containers.tsx`

The remove button in grid and list views needs to trigger the remove confirmation dialog at the route level.

- [ ] **Step 1: Add onRemove prop to ContainerGridCard**

In `container-grid-card.tsx`, add to the props interface:

```typescript
interface ContainerGridCardProps {
  // ... existing props ...
  onRemove?: (container: ContainerSummary) => void
}
```

Update the remove button onClick:

```typescript
<Button
  variant="ghost"
  size="icon"
  className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')}
  title="Remove"
  disabled={locked}
  onClick={() => onRemove?.(container)}
>
  <Trash2 className="size-3.5" />
</Button>
```

- [ ] **Step 2: Add onRemove prop to ContainerListRow**

In `container-list-row.tsx`, add to the props interface:

```typescript
interface ContainerListRowProps {
  // ... existing props ...
  onRemove?: (container: ContainerSummary) => void
}
```

Update the remove button onClick:

```typescript
<Button
  variant="ghost"
  size="icon"
  className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')}
  title="Remove"
  disabled={locked}
  onClick={() => onRemove?.(container)}
>
  <Trash2 className="size-3" />
</Button>
```

- [ ] **Step 3: Wire onRemove in the route**

In `_dashboard.containers.tsx`, update the grid and list rendering to pass `onRemove`:

```typescript
// Grid view
<ContainerGridCard
  // ... existing props ...
  onRemove={(c) => setRemoveTarget(c as GlobalContainerSummary)}
/>

// List view
<ContainerListRow
  // ... existing props ...
  onRemove={(c) => setRemoveTarget(c as GlobalContainerSummary)}
/>
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 5: Test remove in grid and list views**

Run: `pnpm dev`

Open `https://devspace.1dev.my.id/containers` — switch to grid view, click trash icon on a container. Remove dialog should appear. Same for list view.

- [ ] **Step 6: Commit**

```bash
git add app/modules/docker/presentation/container-grid-card.tsx app/modules/docker/presentation/container-list-row.tsx app/routes/_dashboard.containers.tsx
git commit -m "feat: wire remove action in grid and list views to confirmation dialog"
```

---

### Task 17: Add keyboard shortcuts

**Files:**
- Modify: `app/routes/_dashboard.containers.tsx`

Add `/` or `f` to focus search, `Esc` to close drawer/popovers.

- [ ] **Step 1: Add a ref to the search input**

```typescript
const searchRef = useRef<HTMLInputElement>(null)
```

Add `ref={searchRef}` to the search Input.

- [ ] **Step 2: Add keyboard event listener**

```typescript
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    // Don't intercept if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') {
        e.target.blur()
      }
      return
    }

    if (e.key === '/' || e.key === 'f') {
      e.preventDefault()
      searchRef.current?.focus()
    }
    if (e.key === 'Escape') {
      if (drawerOpen) setDrawerOpen(false)
      else if (search) setSearch('')
    }
  }

  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [drawerOpen, search])
```

- [ ] **Step 3: Add import for useRef**

Add `useRef` to the React import at the top of the file:

```typescript
import { useState, useEffect, useMemo, useRef } from 'react'
```

- [ ] **Step 4: Verify type-check passes**

Run: `pnpm tsc --noEmit`

Expected: No new errors.

- [ ] **Step 5: Test keyboard shortcuts**

Run: `pnpm dev`

Open `https://devspace.1dev.my.id/containers`:
1. Press `/` — search input should focus
2. Type a search query, press `Esc` — search should clear
3. Open drawer, press `Esc` — drawer should close

- [ ] **Step 6: Commit**

```bash
git add app/routes/_dashboard.containers.tsx
git commit -m "feat: add keyboard shortcuts (/ to search, Esc to close)"
```

---

### Task 18: Final integration test and polish

**Files:**
- All files

- [ ] **Step 1: Run full type-check**

Run: `pnpm tsc --noEmit`

Expected: No errors.

- [ ] **Step 2: Run build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Test all view modes**

Run: `pnpm dev`

Open `https://devspace.1dev.my.id/containers` and verify each view mode:
1. **Table view:** Columns visible, sorting works, row click opens drawer, action buttons work
2. **Grid view:** Cards render with correct data, click opens drawer, action buttons work, remove triggers dialog
3. **List view:** Compact rows render, click opens drawer, action buttons work, remove triggers dialog

- [ ] **Step 4: Test group-by**

1. Group by Environment — sticky headers per environment, containers grouped correctly
2. Group by Project — sticky headers per project
3. Group by None — flat list, no headers

- [ ] **Step 5: Test column toggle**

1. Open column toggle popover
2. Uncheck "Ports" — Ports column should hide
3. Refresh page — column visibility persisted from localStorage
4. Re-check "Ports" — column reappears

- [ ] **Step 6: Test summary bar filter pills**

1. Click "Running" — only running containers shown
2. Click "Stopped" — only exited containers shown
3. Click "Unhealthy" — only unhealthy containers shown
4. Click "Total" — all containers shown

- [ ] **Step 7: Test search**

1. Type container name in search — list filters
2. Type image name — list filters
3. Clear search — all containers shown

- [ ] **Step 8: Test detail drawer**

1. Click any container — drawer slides in from right
2. Drawer shows container inspect data (live Docker API)
3. Drawer has tabs for Overview, Inspect
4. Close drawer — slides out

- [ ] **Step 9: Test refresh**

1. Click refresh button — spinner appears, data refetches
2. New containers (if any deployed) appear in list

- [ ] **Step 10: Test empty state**

Navigate to a state where no containers exist (if possible) — empty state message shows.

- [ ] **Step 11: Test error state**

Stop Docker Engine (if in dev) — error panel shows with retry button.

- [ ] **Step 12: Test responsive**

1. Resize to mobile width — table scrolls horizontally, grid switches to 1 column, list hides less critical info
2. Resize to tablet — grid 2 columns, table all columns
3. Resize to desktop — grid 3-4 columns, full layout

- [ ] **Step 13: Verify env page still works**

Open `https://devspace.1dev.my.id/configuration/projects/f7fababf-6245-48ca-acbf-79a6bee96a2a/environments/b6eb10bf-ec82-4c3f-8d3a-d53e208e833d/containers`

Verify: table renders same as before, no Environment/Project columns, all actions work. The `isGlobal` prop is not passed, so behavior is unchanged.

- [ ] **Step 14: Final commit if any fixes**

```bash
git add -A
git commit -m "polish: final integration fixes for global containers page"
```

<!-- END_PLAN -->
