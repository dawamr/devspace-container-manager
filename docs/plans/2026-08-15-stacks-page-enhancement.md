# Stacks Page Enhancement Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Enhance the `/stacks` page with visual controls (filter, view-mode, grouping), stack detail drawer (container visibility), and stack-level bulk actions — achieving UX parity with the `/containers` page.

**Architecture:** Phased delivery over 4 phases. P1 (Visual Controls) reuses the presentation component patterns from the containers module. P2 (Stack Detail) adds a new server function + drawer component that queries `container_registry` by `stackName` + `environmentId`. P3 (Custom Stack CRUD) adds schema migration + management UI. P4 (Bulk Actions) reuses existing container action server functions. All server functions enforce RBAC via `requirePermission(RESOURCES.STACKS, ...)` and emit PostHog events.

**Tech Stack:** TanStack Start (server functions), TanStack Query, TanStack Router, React, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL

**Key Constraint:** Stack in DevSpace ≠ stack in Docker. Stack is a visual grouping stored in DB. Auto-detected stacks come from Docker Compose labels (`com.docker.compose.project`). Custom stacks are user-defined groupings.

---

## Phase 1: Visual Controls

### Task 1.1: Create StackViewToggle component

**Objective:** Reusable view-mode toggle for stacks page (grid/table/list).

**Files:**
- Create: `app/modules/docker/presentation/stack-view-toggle.tsx`

**Step 1: Create the component**

```tsx
import { Table, LayoutGrid, List } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type StackViewMode = 'table' | 'grid' | 'list'

interface StackViewToggleProps {
  value: StackViewMode
  onChange: (mode: StackViewMode) => void
}

const MODES: { key: StackViewMode; label: string; icon: typeof Table }[] = [
  { key: 'table', label: 'Table', icon: Table },
  { key: 'grid', label: 'Grid', icon: LayoutGrid },
  { key: 'list', label: 'List', icon: List },
]

export function StackViewToggle({ value, onChange }: StackViewToggleProps) {
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

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-view-toggle.tsx
git commit -m "feat(stacks): add StackViewToggle component"
```

---

### Task 1.2: Create StackGroupControl component

**Objective:** Reusable grouping dropdown for stacks page (none/project/environment).

**Files:**
- Create: `app/modules/docker/presentation/stack-group-control.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import { Layers, ChevronDown } from 'lucide-react'
import { cn } from '#/shared/lib/cn'

export type StackGroupBy = 'none' | 'environment' | 'project'

interface StackGroupControlProps {
  value: StackGroupBy
  onChange: (value: StackGroupBy) => void
}

const OPTIONS: { key: StackGroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
]

export function StackGroupControl({ value, onChange }: StackGroupControlProps) {
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

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-group-control.tsx
git commit -m "feat(stacks): add StackGroupControl component"
```

---

### Task 1.3: Create StackGridCard enhanced component

**Objective:** Enhanced grid card showing project name, environment name, container count, status dot, and last sync time.

**Files:**
- Create: `app/modules/docker/presentation/stack-grid-card.tsx`

**Step 1: Create the component**

```tsx
import { Layers, Container } from 'lucide-react'
import { cn } from '#/shared/lib/cn'
import { GlassPanel } from '#/shared/ui/glass-card'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackGridCardProps {
  stack: GlobalStackSummary
  environmentMap: Map<string, EnvironmentMapEntry>
  onClick: () => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StackGridCard({ stack, environmentMap, onClick }: StackGridCardProps) {
  const env = environmentMap.get(stack.environmentId)
  const projectName = env?.projectName ?? 'Unknown'
  const environmentName = env?.environmentName ?? 'Unknown'

  return (
    <GlassPanel
      className={cn(
        'group cursor-pointer transition-all hover:border-[var(--glass-border-strong)]',
        !stack.isActive && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
              )}
            />
            <span className="truncate text-sm font-medium text-white">{stack.name}</span>
          </div>
          <Layers className="size-4 shrink-0 text-white/40" />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="truncate">{projectName}</span>
          <span className="text-white/30">/</span>
          <span className="truncate">{environmentName}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Container className="size-3.5" />
            <span className="tabular-nums">{stack.containerCount} containers</span>
          </div>
          <span className="text-[10px] text-white/40">
            {formatRelativeTime(stack.lastSeenAt)}
          </span>
        </div>
      </button>
    </GlassPanel>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-grid-card.tsx
git commit -m "feat(stacks): add enhanced StackGridCard component"
```

---

### Task 1.4: Create StackTable component

**Objective:** Compact table view for stacks with columns: name, project, environment, containers, status, last seen.

**Files:**
- Create: `app/modules/docker/presentation/stack-table.tsx`

**Step 1: Create the component**

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
import { cn } from '#/shared/lib/cn'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackTableProps {
  stacks: GlobalStackSummary[]
  environmentMap: Map<string, EnvironmentMapEntry>
  onRowClick: (stack: GlobalStackSummary) => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StackTable({ stacks, environmentMap, onRowClick }: StackTableProps) {
  return (
    <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Stack
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Project
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Environment
            </TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-white/40">
              Containers
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wide text-white/40">
              Status
            </TableHead>
            <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-white/40">
              Last Seen
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stacks.map((stack) => {
            const env = environmentMap.get(stack.environmentId)
            return (
              <TableRow
                key={stack.id}
                className="cursor-pointer border-[var(--glass-border)] transition-colors hover:bg-white/5"
                onClick={() => onRowClick(stack)}
              >
                <TableCell className="text-sm font-medium text-white">
                  {stack.name}
                </TableCell>
                <TableCell className="text-sm text-white/60">
                  {env?.projectName ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-sm text-white/60">
                  {env?.environmentName ?? 'Unknown'}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-white/70">
                  {stack.containerCount}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
                      )}
                    />
                    {stack.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-xs text-white/40">
                  {formatRelativeTime(stack.lastSeenAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-table.tsx
git commit -m "feat(stacks): add StackTable component"
```

---

### Task 1.5: Create StackListRow component

**Objective:** Compact list-row view for stacks (inline expandable later in P2).

**Files:**
- Create: `app/modules/docker/presentation/stack-list-row.tsx`

**Step 1: Create the component**

```tsx
import { Layers, Container, ChevronRight } from 'lucide-react'
import { cn } from '#/shared/lib/cn'
import type { GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import type { EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'

interface StackListRowProps {
  stack: GlobalStackSummary
  environmentMap: Map<string, EnvironmentMapEntry>
  onClick: () => void
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StackListRow({ stack, environmentMap, onClick }: StackListRowProps) {
  const env = environmentMap.get(stack.environmentId)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 py-3 text-left backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)]',
        !stack.isActive && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full',
          stack.isActive ? 'bg-emerald-400' : 'bg-white/40',
        )}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white">{stack.name}</span>
            <span className="shrink-0 text-xs text-white/40">
              {env?.projectName ?? 'Unknown'} / {env?.environmentName ?? 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1 tabular-nums">
          <Container className="size-3.5" />
          {stack.containerCount}
        </span>
        <span className="text-white/30">{formatRelativeTime(stack.lastSeenAt)}</span>
      </div>

      <ChevronRight className="size-4 shrink-0 text-white/40" />
    </button>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-list-row.tsx
git commit -m "feat(stacks): add StackListRow component"
```

---

### Task 1.6: Rewrite StacksPage with toolbar, filter, view-mode, and grouping

**Objective:** Replace the current basic grid page with full toolbar (search, filter, group, view-mode) and three view renderers.

**Files:**
- Modify: `app/routes/_dashboard.stacks.tsx`

**Step 1: Rewrite the page**

```tsx
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Layers, Plus, Search } from 'lucide-react'

import { listAllStacksFn, type GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import { listEnvironmentsMapFn, type EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'
import { StackViewToggle, type StackViewMode } from '#/modules/docker/presentation/stack-view-toggle'
import { StackGroupControl, type StackGroupBy } from '#/modules/docker/presentation/stack-group-control'
import { StackGridCard } from '#/modules/docker/presentation/stack-grid-card'
import { StackTable } from '#/modules/docker/presentation/stack-table'
import { StackListRow } from '#/modules/docker/presentation/stack-list-row'
import { GlassPanel } from '#/shared/ui/glass-card'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'

export const Route = createFileRoute('/_dashboard/stacks')({
  component: StacksPage,
})

type StatusFilter = 'all' | 'active' | 'inactive'

function StacksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [groupBy, setGroupBy] = useState<StackGroupBy>('none')
  const [viewMode, setViewMode] = useState<StackViewMode>('grid')

  const { data: stacks, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-stacks'],
    queryFn: () => listAllStacksFn(),
  })

  const { data: envMapRaw } = useQuery({
    queryKey: ['environments-map'],
    queryFn: () => listEnvironmentsMapFn(),
  })

  const environmentMap = useMemo(() => {
    const map = new Map<string, EnvironmentMapEntry>()
    for (const e of envMapRaw ?? []) {
      map.set(e.environmentId, e)
    }
    return map
  }, [envMapRaw])

  const filtered = useMemo(() => {
    let result = stacks ?? []

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) =>
        statusFilter === 'active' ? s.isActive : !s.isActive,
      )
    }

    return result
  }, [stacks, search, statusFilter])

  const grouped = useMemo(() => {
    if (groupBy === 'none') {
      return [{ label: '', stacks: filtered }]
    }

    const groups = new Map<string, GlobalStackSummary[]>()
    for (const s of filtered) {
      const env = environmentMap.get(s.environmentId)
      const key =
        groupBy === 'project'
          ? (env?.projectName ?? 'Unknown')
          : (env?.environmentName ?? 'Unknown')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s)
    }
    return [...groups.entries()].map(([label, stacks]) => ({ label, stacks }))
  }, [filtered, groupBy, environmentMap])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Stacks</h1>
            <p className="text-sm text-muted-foreground">
              Docker Compose stacks lintas project &amp; environment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="size-4" />
            Deploy
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search stacks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 backdrop-blur-[var(--glass-blur)] focus:border-[var(--glass-border-strong)] focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-0.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-0.5 backdrop-blur-[var(--glass-blur)]">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-[calc(var(--glass-radius)-2px)] px-2.5 py-1.5 text-xs font-medium transition-colors capitalize',
                statusFilter === s
                  ? 'bg-white/10 text-white border border-[var(--glass-border-strong)]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <StackGroupControl value={groupBy} onChange={setGroupBy} />
        <StackViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat stacks…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Layers className="size-10 text-white/20" />
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'Tidak ada stack yang cocok dengan filter.'
              : 'Belum ada stack. Jalankan Docker Compose untuk membuat stack.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-3">
              {group.label && (
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-white/70">{group.label}</h2>
                  <span className="text-xs text-white/40">{group.stacks.length}</span>
                  <div className="h-px flex-1 bg-[var(--glass-border)]" />
                </div>
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.stacks.map((stack) => (
                    <StackGridCard
                      key={stack.id}
                      stack={stack}
                      environmentMap={environmentMap}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <StackTable
                  stacks={group.stacks}
                  environmentMap={environmentMap}
                  onRowClick={() => {}}
                />
              )}

              {viewMode === 'list' && (
                <div className="flex flex-col gap-2">
                  {group.stacks.map((stack) => (
                    <StackListRow
                      key={stack.id}
                      stack={stack}
                      environmentMap={environmentMap}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Verify dev server**

Run: `pnpm dev --port 8081 --host 0.0.0.0`
Navigate to: `https://devspace.1dev.my.id/stacks`
Expected: Page loads with toolbar (search, status filter, group control, view toggle). Grid view by default. Switching to table/list works. Search filters by name. Status filter works. Grouping by project/environment shows group headers.

**Step 4: Commit**

```bash
git add app/routes/_dashboard.stacks.tsx
git commit -m "feat(stacks): add visual controls — search, filter, view-mode, grouping"
```

---

## Phase 2: Stack Detail Drawer

### Task 2.1: Add findContainersByStack repository function

**Objective:** Query `container_registry` by environment + stackName to fetch containers belonging to a stack.

**Files:**
- Modify: `app/modules/docker/infrastructure/container-registry-repository.ts`

**Step 1: Add the function**

Append to the end of `container-registry-repository.ts`:

```ts
export async function findContainersByStack(
  environmentId: string,
  stackName: string,
): Promise<ContainerRegistryRow[]> {
  return db
    .select()
    .from(containerRegistry)
    .where(
      and(
        eq(containerRegistry.environmentId, environmentId),
        eq(containerRegistry.stackName, stackName),
      ),
    )
    .orderBy(containerRegistry.name)
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/infrastructure/container-registry-repository.ts
git commit -m "feat(stacks): add findContainersByStack repository function"
```

---

### Task 2.2: Add findStackById repository function

**Objective:** Fetch a single stack by ID from `stack_registry`.

**Files:**
- Modify: `app/modules/docker/infrastructure/stack-registry-repository.ts`

**Step 1: Add the function**

Append to `stack-registry-repository.ts`:

```ts
export async function findStackById(id: string): Promise<StackRegistryRow | null> {
  const rows = await db
    .select()
    .from(stackRegistry)
    .where(eq(stackRegistry.id, id))
    .limit(1)
  return rows[0] ?? null
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/infrastructure/stack-registry-repository.ts
git commit -m "feat(stacks): add findStackById repository function"
```

---

### Task 2.3: Create getStackDetail server function

**Objective:** Server function that returns stack metadata + container list. Enforces RBAC and emits PostHog event.

**Files:**
- Create: `app/modules/docker/server/get-stack-detail.ts`

**Step 1: Create the server function**

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findStackById } from '../infrastructure/stack-registry-repository'
import { findContainersByStack } from '../infrastructure/container-registry-repository'
import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

export interface StackContainerSummary {
  id: string
  containerId: string
  name: string
  image: string
  state: string
  health: ContainerHealth
  status: string
  createdAt: string
  ports: string[]
  isActive: boolean
}

export interface StackDetail {
  id: string
  name: string
  environmentId: string
  projectId: string
  containerCount: number
  isActive: boolean
  firstSeenAt: string
  lastSeenAt: string
  containers: StackContainerSummary[]
}

/**
 * Get stack detail with container list.
 *
 * Reads from stack_registry + container_registry (DB-backed, fast).
 * Does NOT call Docker Engine — containers come from the registry.
 */
export const getStackDetailFn = createServerFn({ method: 'GET' })
  .validator(z.object({ stackId: z.string().uuid() }))
  .handler(async ({ data }): Promise<StackDetail> => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.READ)

    const stack = await findStackById(data.stackId)
    if (!stack) {
      throw new Error('Stack not found')
    }

    // Verify environment exists
    const env = await findEnvironmentById(stack.environmentId)
    if (!env) {
      throw new Error('Environment not found')
    }

    const containers = await findContainersByStack(stack.environmentId, stack.name)

    await captureServerEvent('stack_detail_viewed', {
      stackId: stack.id,
      stackName: stack.name,
      containerCount: containers.length,
    })

    return {
      id: stack.id,
      name: stack.name,
      environmentId: stack.environmentId,
      projectId: stack.projectId,
      containerCount: stack.containerCount,
      isActive: stack.isActive,
      firstSeenAt: stack.firstSeenAt.toISOString(),
      lastSeenAt: stack.lastSeenAt.toISOString(),
      containers: containers.map((c) => ({
        id: c.containerId,          // ← Docker container ID, NOT DB row UUID
        containerId: c.containerId,
        name: c.name,
        image: c.image,
        state: c.isActive ? 'running' : 'stopped',
        health: (c.health ?? 'none') as ContainerHealth,
        status: c.status ?? '',
        createdAt: c.dockerCreatedAt?.toISOString() ?? c.lastSeenAt.toISOString(),
        ports: (c.ports ?? []) as string[],
        isActive: c.isActive,
      })),
    }
  })
```

**Critical pitfall:** `id` must be `c.containerId` (Docker container ID), not `c.id` (DB row PK). The `ContainerDetailDrawer` will send this `id` to `inspectContainerFn` which calls Docker Engine directly. See skill reference: `container-detail-id-contract.md`.

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/server/get-stack-detail.ts
git commit -m "feat(stacks): add getStackDetailFn server function"
```

---

### Task 2.4: Create StackDetailDrawer component

**Objective:** Slide-over drawer showing stack metadata + container list. Clicking a container opens the existing `ContainerDetailDrawer`.

**Files:**
- Create: `app/modules/docker/presentation/stack-detail-drawer.tsx`

**Step 1: Create the component**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Layers, Container, X } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/shared/ui/sheet'
import { Badge } from '#/shared/ui/badge'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import { getStackDetailFn, type StackContainerSummary } from '#/modules/docker/server/get-stack-detail'
import { cn } from '#/shared/lib/cn'
import { useState } from 'react'

interface StackDetailDrawerProps {
  stackId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('id-ID')
}

export function StackDetailDrawer({ stackId, open, onOpenChange }: StackDetailDrawerProps) {
  const [selectedContainer, setSelectedContainer] = useState<StackContainerSummary | null>(null)
  const [containerDrawerOpen, setContainerDrawerOpen] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['stack-detail', stackId],
    queryFn: () => getStackDetailFn({ data: { stackId: stackId! } }),
    enabled: !!stackId && open,
  })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="size-5 text-white/60" />
              {isLoading ? 'Loading…' : detail?.name ?? 'Stack'}
            </SheetTitle>
            <SheetDescription>
              {detail ? `${detail.containerCount} containers` : 'Stack detail'}
            </SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-white/40">Memuat detail stack…</p>
            </div>
          ) : detail ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
              {/* Metadata */}
              <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Status
                  </dt>
                  <dd>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          detail.isActive ? 'bg-emerald-400' : 'bg-white/40',
                        )}
                      />
                      {detail.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Containers
                  </dt>
                  <dd className="text-sm tabular-nums text-white">{detail.containerCount}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    First Seen
                  </dt>
                  <dd className="text-sm text-white/70">{formatDate(detail.firstSeenAt)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/40">
                    Last Sync
                  </dt>
                  <dd className="text-sm text-white/70">{formatDate(detail.lastSeenAt)}</dd>
                </div>
              </dl>

              {/* Container list */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-white/70">Containers</h3>
                {detail.containers.length === 0 ? (
                  <p className="text-sm text-white/40">Tidak ada container dalam stack ini.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {detail.containers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedContainer(c)
                          setContainerDrawerOpen(true)
                        }}
                        className="flex items-center gap-3 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-white/5 px-3 py-2.5 text-left transition-colors hover:border-[var(--glass-border-strong)] hover:bg-white/10"
                      >
                        <Container className="size-4 shrink-0 text-white/40" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {c.name}
                          </div>
                          <div className="truncate text-xs text-white/50">{c.image}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <HealthBadge health={c.health} />
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              c.isActive ? 'bg-emerald-400' : 'bg-white/40',
                            )}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-white/40">No details available.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Nested container detail drawer */}
      {selectedContainer && (
        <ContainerDetailDrawer
          environmentId={detail?.environmentId ?? ''}
          container={{
            id: selectedContainer.id,
            name: selectedContainer.name,
            image: selectedContainer.image,
            state: selectedContainer.state as 'running' | 'exited' | 'paused' | 'restarting' | 'dead',
            health: selectedContainer.health,
            status: selectedContainer.status,
            createdAt: selectedContainer.createdAt,
            ports: selectedContainer.ports,
          }}
          open={containerDrawerOpen}
          onOpenChange={setContainerDrawerOpen}
        />
      )}
    </>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-detail-drawer.tsx
git commit -m "feat(stacks): add StackDetailDrawer component with container list"
```

---

### Task 2.5: Wire StackDetailDrawer into StacksPage

**Objective:** Connect stack card/row/table clicks to open the detail drawer.

**Files:**
- Modify: `app/routes/_dashboard.stacks.tsx`

**Step 1: Add drawer state and wiring**

Add these imports at the top:

```tsx
import { StackDetailDrawer } from '#/modules/docker/presentation/stack-detail-drawer'
```

Add state inside `StacksPage`:

```tsx
const [selectedStackId, setSelectedStackId] = useState<string | null>(null)
const [drawerOpen, setDrawerOpen] = useState(false)

const handleStackClick = (stack: GlobalStackSummary) => {
  setSelectedStackId(stack.id)
  setDrawerOpen(true)
}
```

Replace all `onClick={() => {}}` with `onClick={() => handleStackClick(stack)}` and `onRowClick={() => {}}` with `onRowClick={handleStackClick}`.

Add the drawer before the closing `</div>` of the page:

```tsx
<StackDetailDrawer
  stackId={selectedStackId}
  open={drawerOpen}
  onOpenChange={setDrawerOpen}
/>
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Verify dev server**

Run: `pnpm dev --port 8081 --host 0.0.0.0`
Navigate to: `https://devspace.1dev.my.id/stacks`
Expected: Click any stack → drawer slides in from right showing stack metadata + container list. Click a container → nested `ContainerDetailDrawer` opens on top with inspect data.

**Step 4: Commit**

```bash
git add app/routes/_dashboard.stacks.tsx
git commit -m "feat(stacks): wire StackDetailDrawer into stacks page"
```

---

## Phase 3: Custom Stack CRUD

### Task 3.1: Add schema migration for custom stacks

**Objective:** Add `type`, `description`, `color` columns to `stack_registry` and create `stack_container_assignments` junction table.

**Files:**
- Modify: `app/shared/db/schema/stack-registry.ts`
- Create: migration via `drizzle-kit generate`

**Step 1: Update schema**

Replace the content of `stack-registry.ts`:

```ts
import { pgTable, uuid, varchar, integer, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core'
import { environments } from './environments'
import { projects } from './projects'
import { containerRegistry } from './container-registry'

export const stackRegistry = pgTable(
  'stack_registry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    containerCount: integer('container_count').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    type: varchar('type', { length: 20 }).default('auto').notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.name, t.environmentId)],
)

export const stackContainerAssignments = pgTable(
  'stack_container_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stackId: uuid('stack_id')
      .references(() => stackRegistry.id, { onDelete: 'cascade' })
      .notNull(),
    containerId: uuid('container_id')
      .references(() => containerRegistry.id, { onDelete: 'cascade' })
      .notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.stackId, t.containerId)],
)
```

**Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: New migration file created in `drizzle/` directory

**Step 3: Apply migration**

Run: `pnpm db:migrate`
Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add app/shared/db/schema/stack-registry.ts drizzle/
git commit -m "feat(stacks): add custom stack schema — type, description, color, assignments table"
```

---

### Task 3.2: Add custom stack repository functions

**Objective:** CRUD repository functions for custom stacks + container assignment.

**Files:**
- Modify: `app/modules/docker/infrastructure/stack-registry-repository.ts`

**Step 1: Add functions**

Append to `stack-registry-repository.ts`:

```ts
import { stackContainerAssignments } from '#/shared/db/schema'
import type { ContainerRegistryRow } from './container-registry-repository'

export type StackContainerAssignmentRow = typeof stackContainerAssignments.$inferSelect

export async function createCustomStack(data: {
  name: string
  environmentId: string
  projectId: string
  description?: string
  color?: string
}): Promise<StackRegistryRow> {
  const [row] = await db
    .insert(stackRegistry)
    .values({
      ...data,
      type: 'custom',
      containerCount: 0,
      isActive: true,
    })
    .returning()
  return row
}

export async function updateStack(
  id: string,
  data: { name?: string; description?: string; color?: string },
): Promise<StackRegistryRow | null> {
  const [row] = await db
    .update(stackRegistry)
    .set(data)
    .where(eq(stackRegistry.id, id))
    .returning()
  return row ?? null
}

export async function deleteStack(id: string): Promise<void> {
  const stack = await findStackById(id)
  if (stack?.type === 'auto') {
    throw new Error('Cannot delete auto-detected stack')
  }
  await db.delete(stackRegistry).where(eq(stackRegistry.id, id))
}

export async function assignContainerToStack(
  stackId: string,
  containerId: string,
): Promise<void> {
  await db
    .insert(stackContainerAssignments)
    .values({ stackId, containerId })
    .onConflictDoNothing()
}

export async function unassignContainerFromStack(
  stackId: string,
  containerId: string,
): Promise<void> {
  await db
    .delete(stackContainerAssignments)
    .where(
      and(
        eq(stackContainerAssignments.stackId, stackId),
        eq(stackContainerAssignments.containerId, containerId),
      ),
    )
}

export async function findAssignedContainers(stackId: string): Promise<string[]> {
  const rows = await db
    .select({ containerId: stackContainerAssignments.containerId })
    .from(stackContainerAssignments)
    .where(eq(stackContainerAssignments.stackId, stackId))
  return rows.map((r) => r.containerId)
}

export async function recomputeStackContainerCount(stackId: string): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stackContainerAssignments)
    .where(eq(stackContainerAssignments.stackId, stackId))
  await db
    .update(stackRegistry)
    .set({ containerCount: count })
    .where(eq(stackRegistry.id, stackId))
}
```

Add `sql` to the import from `drizzle-orm`:

```ts
import { eq, and, inArray, sql } from 'drizzle-orm'
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/infrastructure/stack-registry-repository.ts
git commit -m "feat(stacks): add custom stack CRUD + container assignment repository functions"
```

---

### Task 3.3: Create custom stack server functions

**Objective:** Server functions for create/update/delete custom stack and assign/unassign containers, with RBAC + PostHog.

**Files:**
- Create: `app/modules/docker/server/manage-stack.ts`

**Step 1: Create the server functions**

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import {
  createCustomStack,
  updateStack,
  deleteStack,
  assignContainerToStack,
  unassignContainerFromStack,
  recomputeStackContainerCount,
} from '../infrastructure/stack-registry-repository'
import { captureServerEvent } from '#/shared/lib/posthog-server'

export const createCustomStackFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(1).max(255),
      environmentId: z.string().uuid(),
      projectId: z.string().uuid(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.CREATE)
    const stack = await createCustomStack(data)
    await captureServerEvent('stack_created', {
      stackId: stack.id,
      stackName: stack.name,
      type: 'custom',
    })
    return { id: stack.id, name: stack.name }
  })

export const updateStackFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    const stack = await updateStack(data.stackId, {
      name: data.name,
      description: data.description,
      color: data.color,
    })
    if (stack) {
      await captureServerEvent('stack_updated', { stackId: stack.id })
    }
    return stack ? { id: stack.id } : null
  })

export const deleteStackFn = createServerFn({ method: 'POST' })
  .validator(z.object({ stackId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.DELETE)
    await deleteStack(data.stackId)
    await captureServerEvent('stack_deleted', { stackId: data.stackId })
    return { success: true }
  })

export const assignContainerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      containerId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    await assignContainerToStack(data.stackId, data.containerId)
    await recomputeStackContainerCount(data.stackId)
    await captureServerEvent('container_assigned_to_stack', {
      stackId: data.stackId,
      containerId: data.containerId,
    })
    return { success: true }
  })

export const unassignContainerFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      containerId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.STACKS, ACTIONS.UPDATE)
    await unassignContainerFromStack(data.stackId, data.containerId)
    await recomputeStackContainerCount(data.stackId)
    await captureServerEvent('container_unassigned_from_stack', {
      stackId: data.stackId,
      containerId: data.containerId,
    })
    return { success: true }
  })
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/server/manage-stack.ts
git commit -m "feat(stacks): add custom stack management server functions"
```

---

### Task 3.4: Update listAllStacksFn to include custom stack fields

**Objective:** Return `type`, `description`, `color` in the `GlobalStackSummary` so the UI can distinguish auto vs custom stacks.

**Files:**
- Modify: `app/modules/docker/server/list-all-stacks.ts`

**Step 1: Update interface and return mapping**

Update the `GlobalStackSummary` interface:

```ts
export interface GlobalStackSummary {
  id: string
  name: string
  containerCount: number
  environmentId: string
  projectId: string
  isActive: boolean
  type: 'auto' | 'custom'     // NEW
  description: string | null   // NEW
  color: string | null         // NEW
  lastSeenAt: string
}
```

Update the return mapping:

```ts
return rows.map((r) => ({
  id: r.id,
  name: r.name,
  containerCount: r.containerCount,
  environmentId: r.environmentId,
  projectId: r.projectId,
  isActive: r.isActive,
  type: (r.type ?? 'auto') as 'auto' | 'custom',
  description: r.description ?? null,
  color: r.color ?? null,
  lastSeenAt: r.lastSeenAt.toISOString(),
}))
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors (StackGridCard, StackTable, StackListRow will need to accept the updated type — they already use `GlobalStackSummary` so they inherit the new fields)

**Step 3: Commit**

```bash
git add app/modules/docker/server/list-all-stacks.ts
git commit -m "feat(stacks): include type/description/color in GlobalStackSummary"
```

---

### Task 3.5: Add custom stack badges to presentation components

**Objective:** Show "Custom" badge and color tag on stack cards/rows when type === 'custom'.

**Files:**
- Modify: `app/modules/docker/presentation/stack-grid-card.tsx`
- Modify: `app/modules/docker/presentation/stack-table.tsx`
- Modify: `app/modules/docker/presentation/stack-list-row.tsx`

**Step 1: Add badge to StackGridCard**

In `stack-grid-card.tsx`, add after the stack name:

```tsx
{stack.type === 'custom' && (
  <span
    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
    style={{
      backgroundColor: stack.color ? `${stack.color}20` : 'rgba(255,255,255,0.1)',
      color: stack.color ?? 'rgba(255,255,255,0.6)',
    }}
  >
    Custom
  </span>
)}
```

**Step 2: Add badge to StackTable**

In `stack-table.tsx`, add inside the name cell, after `{stack.name}`:

```tsx
{stack.type === 'custom' && (
  <span
    className="ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium"
    style={{
      backgroundColor: stack.color ? `${stack.color}20` : 'rgba(255,255,255,0.1)',
      color: stack.color ?? 'rgba(255,255,255,0.6)',
    }}
  >
    Custom
  </span>
)}
```

**Step 3: Add badge to StackListRow**

In `stack-list-row.tsx`, add after `{stack.name}`:

```tsx
{stack.type === 'custom' && (
  <span
    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
    style={{
      backgroundColor: stack.color ? `${stack.color}20` : 'rgba(255,255,255,0.1)',
      color: stack.color ?? 'rgba(255,255,255,0.6)',
    }}
  >
    Custom
  </span>
)}
```

**Step 4: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add app/modules/docker/presentation/stack-grid-card.tsx app/modules/docker/presentation/stack-table.tsx app/modules/docker/presentation/stack-list-row.tsx
git commit -m "feat(stacks): show Custom badge + color tag on stack cards/rows"
```

---

### Task 3.6: Create CreateStackDialog component

**Objective:** Dialog form for creating custom stacks (name, description, color, project, environment).

**Files:**
- Create: `app/modules/docker/presentation/create-stack-dialog.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/shared/ui/dialog'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import { Label } from '#/shared/ui/label'
import { createCustomStackFn } from '#/modules/docker/server/manage-stack'
import { useQuery } from '@tanstack/react-query'
import { listEnvironmentsMapFn } from '#/modules/docker/server/list-environments-map'
import { cn } from '#/shared/lib/cn'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#ef4444',
]

export function CreateStackDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [environmentId, setEnvironmentId] = useState('')
  const queryClient = useQueryClient()

  const { data: envMap } = useQuery({
    queryKey: ['environments-map'],
    queryFn: () => listEnvironmentsMapFn(),
  })

  const mutation = useMutation({
    mutationFn: () =>
      createCustomStackFn({
        data: {
          name,
          description: description || undefined,
          color,
          environmentId,
          projectId: envMap?.find((e) => e.environmentId === environmentId)?.projectId ?? '',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stacks'] })
      setOpen(false)
      setName('')
      setDescription('')
      setColor(PRESET_COLORS[0])
      setEnvironmentId('')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New Stack
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        <DialogHeader>
          <DialogTitle>Create Custom Stack</DialogTitle>
          <DialogDescription>
            Buat grouping visual custom untuk mengelompokkan container.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stack-name">Name</Label>
            <Input
              id="stack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. monitoring-stack"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stack-desc">Description (optional)</Label>
            <Input
              id="stack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Prometheus + Grafana + Alertmanager"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stack-env">Environment</Label>
            <select
              id="stack-env"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 text-sm text-white backdrop-blur-[var(--glass-blur)]"
            >
              <option value="">Select environment…</option>
              {envMap?.map((e) => (
                <option key={e.environmentId} value={e.environmentId}>
                  {e.projectName} / {e.environmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-transform',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !environmentId || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Stack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/create-stack-dialog.tsx
git commit -m "feat(stacks): add CreateStackDialog for custom stack creation"
```

---

### Task 3.7: Wire CreateStackDialog into StacksPage and update Deploy button

**Objective:** Replace the non-functional "Deploy" button with "New Stack" (CreateStackDialog).

**Files:**
- Modify: `app/routes/_dashboard.stacks.tsx`

**Step 1: Replace Deploy button with CreateStackDialog**

Add import:

```tsx
import { CreateStackDialog } from '#/modules/docker/presentation/create-stack-dialog'
```

Replace the Deploy button:

```tsx
{/* Replace: */}
<Button size="sm">
  <Plus className="size-4" />
  Deploy
</Button>

{/* With: */}
<CreateStackDialog />
```

Remove the now-unused `Plus` import if it's only used for the Deploy button.

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Verify dev server**

Run: `pnpm dev --port 8081 --host 0.0.0.0`
Navigate to: `https://devspace.1dev.my.id/stacks`
Expected: "New Stack" button opens dialog. Fill name, select environment, pick color. Create → stack appears in list with "Custom" badge.

**Step 4: Commit**

```bash
git add app/routes/_dashboard.stacks.tsx
git commit -m "feat(stacks): replace Deploy button with CreateStackDialog"
```

---

## Phase 4: Stack-Level Bulk Actions

### Task 4.1: Add bulk action server function

**Objective:** Server function that applies start/stop/restart to all containers in a stack.

**Files:**
- Create: `app/modules/docker/server/stack-bulk-action.ts`

**Step 1: Create the server function**

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { findStackById } from '../infrastructure/stack-registry-repository'
import { findContainersByStack } from '../infrastructure/container-registry-repository'
import { withDocker } from '../infrastructure/docker-client'
import { captureServerEvent } from '#/shared/lib/posthog-server'

const ACTION_SCHEMA = z.enum(['start', 'stop', 'restart'])

/**
 * Apply a bulk action (start/stop/restart) to all containers in a stack.
 *
 * Resolves the environment's Docker host from DB, then calls Docker Engine
 * for each container. Returns per-container results.
 */
export const stackBulkActionFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      stackId: z.string().uuid(),
      action: ACTION_SCHEMA,
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.UPDATE)

    const stack = await findStackById(data.stackId)
    if (!stack) throw new Error('Stack not found')

    const containers = await findContainersByStack(stack.environmentId, stack.name)
    if (containers.length === 0) {
      return { actioned: 0, errors: [] }
    }

    // Resolve Docker host
    const { findEnvironmentById } = await import('#/modules/environments/infrastructure/environment-repository')
    const env = await findEnvironmentById(stack.environmentId)
    if (!env) throw new Error('Environment not found')

    const results: { containerId: string; success: boolean; error?: string }[] = []

    for (const c of containers) {
      try {
        await withDocker(
          'stackBulkAction',
          (docker) => {
            const container = docker.getContainer(c.containerId)
            switch (data.action) {
              case 'start':
                return container.start()
              case 'stop':
                return container.stop()
              case 'restart':
                return container.restart()
            }
          },
          { dockerHost: env.dockerHost, dockerCertPath: env.dockerCertPath },
        )
        results.push({ containerId: c.containerId, success: true })
      } catch (err) {
        results.push({
          containerId: c.containerId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    await captureServerEvent('stack_bulk_action', {
      stackId: stack.id,
      action: data.action,
      total: containers.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    })

    return {
      actioned: results.filter((r) => r.success).length,
      errors: results.filter((r) => !r.success),
    }
  })
```

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/server/stack-bulk-action.ts
git commit -m "feat(stacks): add stackBulkActionFn for bulk start/stop/restart"
```

---

### Task 4.2: Add bulk action bar to StackDetailDrawer

**Objective:** Add Start All / Stop All / Restart All buttons to the stack detail drawer.

**Files:**
- Modify: `app/modules/docker/presentation/stack-detail-drawer.tsx`

**Step 1: Add bulk action state and mutation**

Add imports:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCw, Loader2 } from 'lucide-react'
import { stackBulkActionFn } from '#/modules/docker/server/stack-bulk-action'
```

Add inside `StackDetailDrawer` component, after the `useQuery` for detail:

```tsx
const queryClient = useQueryClient()
const [pendingAction, setPendingAction] = useState<'start' | 'stop' | 'restart' | null>(null)

const bulkMutation = useMutation({
  mutationFn: (action: 'start' | 'stop' | 'restart') =>
    stackBulkActionFn({ data: { stackId: stackId!, action } }),
  onMutate: (action) => setPendingAction(action),
  onSettled: () => setPendingAction(null),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['stack-detail', stackId] })
    queryClient.invalidateQueries({ queryKey: ['all-stacks'] })
  },
})

const isBusy = bulkMutation.isPending
```

**Step 2: Add action bar UI**

Add this between the metadata section and container list in the drawer:

```tsx
{/* Bulk action bar */}
{detail && detail.containers.length > 0 && (
  <div className="flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-white/5 p-1.5">
    <span className="px-2 text-xs text-white/50">Bulk:</span>
    <button
      type="button"
      disabled={isBusy}
      onClick={() => bulkMutation.mutate('start')}
      className="flex items-center gap-1.5 rounded-[calc(var(--glass-radius)-2px)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
    >
      {pendingAction === 'start' && isBusy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
      Start All
    </button>
    <button
      type="button"
      disabled={isBusy}
      onClick={() => bulkMutation.mutate('stop')}
      className="flex items-center gap-1.5 rounded-[calc(var(--glass-radius)-2px)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
    >
      {pendingAction === 'stop' && isBusy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Square className="size-3.5" />
      )}
      Stop All
    </button>
    <button
      type="button"
      disabled={isBusy}
      onClick={() => bulkMutation.mutate('restart')}
      className="flex items-center gap-1.5 rounded-[calc(var(--glass-radius)-2px)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
    >
      {pendingAction === 'restart' && isBusy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RotateCw className="size-3.5" />
      )}
      Restart All
    </button>
  </div>
)}
```

**Step 3: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 4: Verify dev server**

Run: `pnpm dev --port 8081 --host 0.0.0.0`
Navigate to: `https://devspace.1dev.my.id/stacks`
Expected: Open a stack detail drawer → bulk action bar appears above container list. Click "Start All" / "Stop All" / "Restart All" → buttons show spinner during action → container states update after completion.

**Step 4: Commit**

```bash
git add app/modules/docker/presentation/stack-detail-drawer.tsx
git commit -m "feat(stacks): add bulk start/stop/restart to StackDetailDrawer"
```

---

### Task 4.3: Add container assignment UI to StackDetailDrawer

**Objective:** Allow users to assign/unassign containers to custom stacks from the detail drawer.

**Files:**
- Modify: `app/modules/docker/presentation/stack-detail-drawer.tsx`

**Step 1: Add assignment section**

Add imports:

```tsx
import { assignContainerFn, unassignContainerFn } from '#/modules/docker/server/manage-stack'
```

This is a more involved UI addition. Add an "Assign Containers" section below the container list in the drawer, visible only for custom stacks (`detail.type === 'custom'`). The section shows unassigned containers from the same environment as a multi-select checklist.

> **Note:** This task is intentionally left as a UI expansion point. The server functions (`assignContainerFn`, `unassignContainerFn`) are already created in Task 3.3. The UI needs:
> 1. Fetch all containers in the stack's environment (via `listAllContainersFn` filtered by environmentId)
> 2. Show unassigned containers with checkboxes
> 3. On check → call `assignContainerFn`, on uncheck → call `unassignContainerFn`
> 4. Invalidate `stack-detail` query on success

**Step 2: Verify typecheck**

Run: `pnpm tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add app/modules/docker/presentation/stack-detail-drawer.tsx
git commit -m "feat(stacks): add container assignment UI to StackDetailDrawer"
```

---

## Verification Checklist

After all phases are complete:

- [ ] `pnpm tsc --noEmit` passes with no errors
- [ ] Dev server starts: `pnpm dev --port 8081 --host 0.0.0.0`
- [ ] `/stacks` page loads with toolbar (search, status filter, group, view toggle)
- [ ] Grid view shows enhanced cards with project/env names, container count, status
- [ ] Table view shows all columns
- [ ] List view shows compact rows
- [ ] Search filters by stack name
- [ ] Status filter (all/active/inactive) works
- [ ] Grouping by project/environment shows group headers with counts
- [ ] Clicking a stack opens detail drawer with metadata + container list
- [ ] Clicking a container in drawer opens ContainerDetailDrawer with inspect data
- [ ] "New Stack" button opens create dialog
- [ ] Create custom stack → appears in list with "Custom" badge + color
- [ ] Bulk Start All / Stop All / Restart All work from stack detail drawer
- [ ] PostHog events fire: `stack_list_viewed`, `stack_detail_viewed`, `stack_created`, `stack_bulk_action`

---

## Architecture Notes

### Data Flow

```
Browser (Stacks Page)
  ↓ useQuery
TanStack Server Function (listAllStacksFn / getStackDetailFn)
  ↓ requirePermission (RBAC)
  ↓ Repository (stack-registry-repository / container-registry-repository)
  ↓ Drizzle ORM → PostgreSQL
```

### Key Design Decisions

1. **DB-backed reads, fire-and-forget sync**: Stack/container data comes from DB (fast). Background sync refreshes from Docker Engine. No blocking Docker calls on page load.
2. **Container ID = Docker ID**: `StackContainerSummary.id` is the Docker container ID, not the DB row UUID. This is required for `ContainerDetailDrawer` → `inspectContainerFn` to work.
3. **Auto vs Custom stacks**: Auto-detected stacks (from Docker Compose labels) are read-only. Custom stacks support full CRUD + container assignment.
4. **Bulk actions hit Docker Engine**: Unlike list reads (DB-backed), bulk actions must call Docker Engine to start/stop/restart containers. The server function resolves the Docker host from the environment record.

### Reused Patterns

| Pattern | Source | Reused In |
|---|---|---|
| View toggle (table/grid/list) | `ContainerViewToggle` | `StackViewToggle` |
| Group control dropdown | `ContainerGroupControl` | `StackGroupControl` |
| Glass card panel | `GlassPanel` | `StackGridCard` |
| Detail drawer (Sheet) | `ContainerDetailDrawer` | `StackDetailDrawer` |
| Bulk action bar | `ContainerBulkToolbar` | Stack detail drawer bulk bar |
| Health badge | `HealthBadge` | Stack detail container list |
| RBAC + PostHog | All server functions | All new server functions |
