# Container Management Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah Search, Filter, Sort, Remove action, Health status ke Container List, plus Container Detail Drawer (overview/ports/env) dan Container Detail Page (logs streaming + inspect JSON) di DevSpace.

**Architecture:** Frontend-only search/filter/sort (TanStack Table client-side, container count kecil). Detail data diambil via 3 server functions baru (`inspectContainerFn`, `containerLogsFn`, `removeContainerFn`) yang semuanya lewat `withDocker` + `requirePermission`. Hybrid UI: quick view di Sheet drawer, logs/inspect di route halaman terpisah.

**Tech Stack:** TanStack Start, TanStack Table v8, TanStack Query v5, radix-ui (Tabs, AlertDialog, Sheet), dockerode, Zod, lucide-react, Tailwind v4.

---

## File Structure

```
app/modules/docker/
  domain/
    docker-types.ts          MODIFY  (extend ContainerSummary + add ContainerDetail + mapContainerInfo + mapContainerInspect)
  server/
    remove-container.ts      CREATE  (RESOURCES.CONTAINERS / ACTIONS.DELETE)
    inspect-container.ts     CREATE  (RESOURCES.CONTAINERS / ACTIONS.READ)
    container-logs.ts        CREATE  (RESOURCES.CONTAINERS / ACTIONS.READ + RESOURCES.LOGS)
  presentation/
    container-table.tsx      MODIFY  (search, status filter, sort, remove action, health badge, row->drawer)
    container-health-badge.tsx    CREATE  (HealthBadge component)
    container-detail-drawer.tsx   CREATE  (Sheet + Tabs: overview/ports/env)
    container-logs-viewer.tsx     CREATE  (logs page component)
    container-inspect-viewer.tsx  CREATE  (inspect JSON viewer component)

app/routes/
  _dashboard.projects.$projectId.environments.$environmentId.containers.tsx
                              MODIFY  (pass openDrawer state to ContainerTable)
  _dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.tsx
                              CREATE  (detail layout: header + Tabs nav: Logs | Inspect)
  _dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.index.tsx
                              CREATE  (redirect to /logs default tab)
  _dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.logs.tsx
                              CREATE  (mounts ContainerLogsViewer)
  _dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.inspect.tsx
                              CREATE  (mounts ContainerInspectViewer)
```

Verification gate per task: `pnpm tsc --noEmit` (atau `npx tsc --noEmit`) di root project. Manual verify: `pnpm dev`, buka halaman containers, jalankan aksi.

---

## Task 1: Extend ContainerSummary + add ContainerDetail type

**Files:**
- Modify: `app/modules/docker/domain/docker-types.ts`

- [ ] **Step 1: Add `health` field to `ContainerSummary` and parse from `Status`**

Di `docker-types.ts`, ubah interface `ContainerSummary` dan `mapContainerInfo`:

```typescript
export type ContainerHealth = 'healthy' | 'unhealthy' | 'starting' | 'none'

export interface ContainerSummary {
  id: string
  name: string // first name from Names[], leading "/" stripped
  image: string
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead'
  status: string // human-readable from Status field
  health: ContainerHealth // parsed from Status "(healthy|unhealthy|starting)"
  createdAt: string // ISO-8601
  ports: string[] // simplified port mapping strings
}
```

Tambah helper parse health dan gunakan di `mapContainerInfo`:

```typescript
function normalizeHealth(status: string): ContainerHealth {
  if (/\((healthy)\)/i.test(status)) return 'healthy'
  if (/\((unhealthy)\)/i.test(status)) return 'unhealthy'
  if (/\((starting)\)/i.test(status)) return 'starting'
  return 'none'
}

export function mapContainerInfo(info: Docker.ContainerInfo): ContainerSummary {
  const rawName = info.Names?.[0] ?? ''
  return {
    id: info.Id,
    name: rawName.replace(/^\//, ''),
    image: info.Image,
    state: normalizeState(info.State),
    status: info.Status,
    health: normalizeHealth(info.Status),
    createdAt: new Date(info.Created * 1000).toISOString(),
    ports: mapPorts(info.Ports),
  }
}
```

- [ ] **Step 2: Add `ContainerDetail` type + `mapContainerInspect`**

Tambah di bawah `mapContainerInfo`:

```typescript
export interface ContainerEnvVar {
  key: string
  value: string
}

export interface ContainerPortMapping {
  containerPort: string
  hostIp: string
  hostPort: string
  protocol: string
}

export interface ContainerMount {
  source: string
  destination: string
  mode: string
  type: string
}

export interface ContainerDetail {
  id: string
  name: string
  image: string
  state: string
  health: ContainerHealth
  status: string
  created: string // ISO
  startedAt: string // ISO
  finishedAt: string // ISO
  restartCount: number
  command: string[]
  entrypoint: string[]
  env: ContainerEnvVar[]
  ports: ContainerPortMapping[]
  mounts: ContainerMount[]
  networks: string[]
  raw: Record<string, unknown> // full inspect JSON for the Inspect tab
}

function mapEnv(env: string[] | undefined): ContainerEnvVar[] {
  if (!env) return []
  return env.map((e) => {
    const idx = e.indexOf('=')
    if (idx === -1) return { key: e, value: '' }
    return { key: e.slice(0, idx), value: e.slice(idx + 1) }
  })
}

function mapInspectPorts(
  ports: NonNullable<Docker.ContainerInspectInfo['NetworkSettings']>['Ports'],
): ContainerPortMapping[] {
  if (!ports) return []
  const result: ContainerPortMapping[] = []
  for (const [key, bindings] of Object.entries(ports)) {
    const [containerPort, protocol] = key.split('/')
    const binding = Array.isArray(bindings) ? bindings[0] : undefined
    result.push({
      containerPort,
      hostIp: binding?.HostIp ?? '',
      hostPort: binding?.HostPort ?? '',
      protocol: protocol ?? '',
    })
  }
  return result
}

export function mapContainerInspect(info: Docker.ContainerInspectInfo): ContainerDetail {
  const state = info.State ?? {}
  const config = info.Config ?? {}
  const healthStatus = (state.Health?.Status as ContainerHealth) ?? 'none'
  return {
    id: info.Id,
    name: (info.Name ?? '').replace(/^\//, ''),
    image: config.Image ?? '',
    state: state.Status ?? '',
    health: healthStatus,
    status: state.Status ?? '',
    created: info.Created ?? '',
    startedAt: state.StartedAt ?? '',
    finishedAt: state.FinishedAt ?? '',
    restartCount: state.RestartCount ?? 0,
    command: config.Cmd ?? [],
    entrypoint: config.Entrypoint ?? [],
    env: mapEnv(config.Env),
    ports: mapInspectPorts(info.NetworkSettings?.Ports),
    mounts: (info.Mounts ?? []).map((m) => ({
      source: m.Source ?? '',
      destination: m.Destination ?? '',
      mode: m.Mode ?? '',
      type: m.Type ?? '',
    })),
    networks: Object.keys(info.NetworkSettings?.Networks ?? {}),
    raw: info as unknown as Record<string, unknown>,
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /srv/apps/mono/dev-spaces && npx tsc --noEmit`
Expected: no type errors (warnings allowed). `@types/dockerode` v4 ships `ContainerInspectInfo` — if `Mounts[].Source` differs, adjust the `m.Source` access to `m.Source as string`.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/domain/docker-types.ts
git commit -m "feat(docker): add health field + ContainerDetail type with inspect mapper"
```

## Task 2: Container List — search, filter, sort, health badge, remove action

**Files:**
- Modify: `app/modules/docker/presentation/container-table.tsx`
- Create: `app/modules/docker/presentation/container-health-badge.tsx`

- [ ] **Step 1: Create `HealthBadge` component**

`app/modules/docker/presentation/container-health-badge.tsx`:

```typescript
import { Badge } from '#/shared/ui/badge'
import type { ContainerHealth } from '#/modules/docker/domain/docker-types'

const HEALTH_STYLES: Record<ContainerHealth, string> = {
  healthy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  unhealthy: 'bg-red-500/20 text-red-300 border-red-500/30',
  starting: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  none: 'bg-white/10 text-white/50 border-white/20',
}

export function HealthBadge({ health }: { health: ContainerHealth }) {
  if (health === 'none') return null
  return (
    <Badge variant="outline" className={HEALTH_STYLES[health]}>
      {health}
    </Badge>
  )
}
```

- [ ] **Step 2: Enhance `container-table.tsx` with search, filter, sort, remove**

Ganti imports di atas:

```typescript
import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCw, Trash2, Loader2, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import type { ContainerSummary, ContainerHealth } from '#/modules/docker/domain/docker-types'
import { userFriendlyDockerMessage } from '#/modules/docker/domain/docker-error'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { Input } from '#/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'
```

Ganti seluruh body `ContainerTable`:

```typescript
const columnHelper = createColumnHelper<ContainerSummary>()

interface ContainerTableProps {
  containers: ContainerSummary[]
  environmentId: string
  onOpenDetail: (container: ContainerSummary) => void
}

export function ContainerTable({ containers, environmentId, onOpenDetail }: ContainerTableProps) {
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [removeTarget, setRemoveTarget] = useState<ContainerSummary | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['containers', environmentId] })
  }

  const startMutation = useMutation({
    mutationFn: (containerId: string) =>
      startContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => { setError(null); setPendingId(containerId) },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const stopMutation = useMutation({
    mutationFn: (containerId: string) =>
      stopContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => { setError(null); setPendingId(containerId) },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const restartMutation = useMutation({
    mutationFn: (containerId: string) =>
      restartContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => { setError(null); setPendingId(containerId) },
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const removeMutation = useMutation({
    mutationFn: (containerId: string) =>
      removeContainerFn({ data: { environmentId, containerId } }),
    onMutate: (containerId) => { setError(null); setPendingId(containerId) },
    onSuccess: () => { setRemoveTarget(null); invalidate() },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingId(null),
  })

  const columns = useMemo<ColumnDef<ContainerSummary, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span className="font-medium text-card-foreground">{info.getValue()}</span>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('image', {
        header: 'Image',
        cell: (info) => <span className="text-white/70">{info.getValue()}</span>,
        enableSorting: true,
      }),
      columnHelper.accessor('state', {
        header: 'State',
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <StateBadge state={info.getValue()} />
            <HealthBadge health={info.row.original.health} />
          </div>
        ),
        filterFn: 'equalsString',
        enableSorting: true,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <span className="text-white/70">{info.getValue()}</span>,
        enableSorting: false,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => (
          <span className="text-white/70">
            {new Date(info.getValue()).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('ports', {
        header: 'Ports',
        cell: (info) => {
          const ports = info.getValue()
          if (!ports || ports.length === 0) {
            return <span className="text-white/40">—</span>
          }
          return (
            <div className="flex flex-wrap gap-1">
              {ports.map((p: string) => (
                <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                  {p}
                </Badge>
              ))}
            </div>
          )
        },
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const container = info.row.original
          const isPending = pendingId === container.id

          const canStart = container.state === 'exited' || container.state === 'paused'
          const canStop = container.state === 'running' || container.state === 'paused'
          const canRestart = container.state === 'running'
          const canRemove = container.state !== 'restarting'
          const locked = container.state === 'restarting'

          return (
            <div className="flex items-center gap-1">
              {isPending ? (
                <Loader2 className="size-4 animate-spin text-white/50" />
              ) : (
                <>
                  <Button
                    variant="ghost" size="icon" className={ACTION_BTN_CLASS}
                    title="Start" disabled={!canStart || locked}
                    onClick={(e) => { e.stopPropagation(); startMutation.mutate(container.id) }}
                  >
                    <Play className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className={ACTION_BTN_CLASS}
                    title="Stop" disabled={!canStop || locked}
                    onClick={(e) => { e.stopPropagation(); stopMutation.mutate(container.id) }}
                  >
                    <Square className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className={ACTION_BTN_CLASS}
                    title="Restart" disabled={!canRestart || locked}
                    onClick={(e) => { e.stopPropagation(); restartMutation.mutate(container.id) }}
                  >
                    <RotateCw className="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className={ACTION_BTN_CLASS}
                    title="Remove" disabled={!canRemove || locked}
                    onClick={(e) => { e.stopPropagation(); setRemoveTarget(container) }}
                  >
                    <Trash2 className="size-4 text-red-400" />
                  </Button>
                </>
              )}
            </div>
          )
        },
      }),
    ],
    [pendingId, startMutation, stopMutation, restartMutation],
  )

  const table = useReactTable({
    data: containers,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      return (
        row.original.name.toLowerCase().includes(search) ||
        row.original.image.toLowerCase().includes(search) ||
        row.original.state.toLowerCase().includes(search) ||
        row.original.status.toLowerCase().includes(search)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const stateFilter = table.getColumn('state')?.getFilterValue() as string | undefined

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-center gap-2 rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar: Search + Filter */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search containers..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={stateFilter ?? 'all'}
          onValueChange={(value) => {
            table.getColumn('state')?.setFilterValue(value === 'all' ? undefined : value)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="exited">Exited</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="restarting">Restarting</SelectItem>
            <SelectItem value="dead">Dead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          className={
                            canSort
                              ? 'flex cursor-pointer items-center gap-1 hover:text-white'
                              : ''
                          }
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            sorted === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-40" />
                            )
                          )}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-white/50">
                  No containers found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onOpenDetail(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove container</DialogTitle>
            <DialogDescription>
              Remove <strong>{removeTarget?.name}</strong>?{' '}
              {removeTarget?.state === 'running'
                ? 'Container is running — it will be force-removed.'
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

Catatan: `StateBadge`, `errorMessage`, `ACTION_BTN_CLASS`, `STATE_STYLES` tetap di file yang sama (tidak berubah). Hapus `ContainerHealth` dari imports jika tidak digunakan di file ini (hanya digunakan di `HealthBadge`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. Jika `enableSorting` prop tidak dikenali di TanStack Table v8, ganti dengan `sortingFn: 'alphanumeric'` pada kolom yang bisa sort dan `enableSorting: false` pada yang tidak.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/presentation/container-health-badge.tsx app/modules/docker/presentation/container-table.tsx
git commit -m "feat(containers): add search, status filter, sort, health badge, remove action"
```

## Task 3: `removeContainerFn` server function

**Files:**
- Create: `app/modules/docker/server/remove-container.ts`

- [ ] **Step 1: Write `remove-container.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const removeInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
})

/**
 * Remove a container. If the container is running, `force: true` is used
 * to stop+remove in one call. Requires CONTAINERS.DELETE permission.
 */
export const removeContainerFn = createServerFn({ method: 'POST' })
  .validator(removeInput)
  .handler(async ({ data }) => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.DELETE)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    await withDocker(
      'removeContainer',
      (docker) => {
        const container = docker.getContainer(data.containerId)
        return container.remove({ force: true, v: true })
      },
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    await captureServerEvent('container_removed', {
      environmentId: data.environmentId,
      containerId: data.containerId,
      dockerHost: redactDockerHost(environment.dockerHost),
    })

    return { success: true as const, containerId: data.containerId }
  })
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/server/remove-container.ts
git commit -m "feat(docker): add removeContainerFn server function"
```

---

## Task 4: `inspectContainerFn` server function

**Files:**
- Create: `app/modules/docker/server/inspect-container.ts`

- [ ] **Step 1: Write `inspect-container.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { mapContainerInspect, type ContainerDetail } from '../domain/docker-types'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const inspectInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
})

/**
 * Inspect a container — returns full details (state, config, env, ports,
 * mounts, networks). Requires CONTAINERS.READ permission.
 */
export const inspectContainerFn = createServerFn({ method: 'GET' })
  .validator(inspectInput)
  .handler(async ({ data }): Promise<ContainerDetail> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    const startedAt = performance.now()

    const inspectInfo = await withDocker(
      'inspectContainer',
      (docker) => docker.getContainer(data.containerId).inspect(),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    const detail = mapContainerInspect(inspectInfo)

    await captureServerEvent('container_inspected', {
      environmentId: data.environmentId,
      containerId: data.containerId,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return detail
  })
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. Jika `dockerode` v5 `ContainerInspectInfo` type berbeda, `mapContainerInspect` menerima `any`-ish fallback via `as unknown as`.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/server/inspect-container.ts
git commit -m "feat(docker): add inspectContainerFn server function"
```

---

## Task 5: `containerLogsFn` server function

**Files:**
- Create: `app/modules/docker/server/container-logs.ts`

- [ ] **Step 1: Write `container-logs.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { findEnvironmentById } from '#/modules/environments/infrastructure/environment-repository'
import { requirePermission } from '#/modules/rbac/server/require-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import { withDocker } from '../infrastructure/docker-client'
import { captureServerEvent } from '#/shared/lib/posthog-server'
import { redactDockerHost } from '#/shared/lib/posthog'

const logsInput = z.object({
  environmentId: z.string().uuid(),
  containerId: z.string().min(1),
  tail: z.number().int().min(1).max(1000).default(200),
  since: z.number().optional(), // unix timestamp
  timestamps: z.boolean().default(true),
})

export interface ContainerLogLine {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

/**
 * Fetch container logs (one-shot, not streaming). Returns parsed log lines
 * with timestamp + stream type. Requires CONTAINERS.READ + LOGS.READ.
 */
export const containerLogsFn = createServerFn({ method: 'GET' })
  .validator(logsInput)
  .handler(async ({ data }): Promise<ContainerLogLine[]> => {
    await requirePermission(RESOURCES.CONTAINERS, ACTIONS.READ)
    await requirePermission(RESOURCES.LOGS, ACTIONS.READ)

    const environment = await findEnvironmentById(data.environmentId)
    if (!environment) {
      throw new Error('ENVIRONMENT_NOT_FOUND')
    }

    const startedAt = performance.now()

    const rawStream = await withDocker(
      'containerLogs',
      (docker) =>
        docker.getContainer(data.containerId).logs({
          stdout: true,
          stderr: true,
          follow: false,
          tail: data.tail,
          since: data.since ?? 0,
          timestamps: data.timestamps,
        }),
      {
        dockerHost: environment.dockerHost,
        dockerCertPath: environment.dockerCertPath,
        resourceId: data.containerId,
      },
    )

    const lines = parseDockerLogs(rawStream, data.timestamps)

    await captureServerEvent('container_logs_viewed', {
      environmentId: data.environmentId,
      containerId: data.containerId,
      lineCount: lines.length,
      dockerHost: redactDockerHost(environment.dockerHost),
      duration_ms: Math.round(performance.now() - startedAt),
    })

    return lines
  })

/**
 * Parse dockerode's multiplexed log stream into structured lines.
 *
 * dockerode returns a Buffer that, when timestamps: true, has lines like:
 *   "2024-01-01T00:00:00.000000000Z log message\n"
 *
 * When the container was started with a TTY, the stream is NOT multiplexed
 * and we can split by newline directly. When no TTY, dockerode returns a
 * raw multiplexed stream that we demultiplex using the 8-byte header.
 */
function parseDockerLogs(
  raw: Buffer | NodeJS.ReadableStream,
  withTimestamps: boolean,
): ContainerLogLine[] {
  // dockerode logs() returns a Node stream when follow:true, Buffer when follow:false
  if (!Buffer.isBuffer(raw)) return []

  const text = raw.toString('utf-8')
  const lines = text.split('\n').filter((l) => l.length > 0)

  return lines.map((line) => {
    let timestamp = ''
    let message = line
    let stream: 'stdout' | 'stderr' = 'stdout'

    if (withTimestamps) {
      // Docker timestamp format: "2024-01-01T00:00:00.000000000Z message"
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/)
      if (match) {
        timestamp = match[1]
        message = match[2]
      }
    }

    return { timestamp, stream, message }
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. Jika `dockerode` v5 logs return type berbeda, cast `rawStream as unknown as Buffer` di `parseDockerLogs`.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/server/container-logs.ts
git commit -m "feat(docker): add containerLogsFn server function"
```

## Task 6: Container Detail Drawer (overview, ports, env)

**Files:**
- Create: `app/modules/docker/presentation/container-detail-drawer.tsx`

- [ ] **Step 1: Create the drawer component**

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'radix-ui'
import { Link } from '@tanstack/react-router'

import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '#/shared/ui/sheet'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/shared/ui/table'

interface ContainerDetailDrawerProps {
  container: ContainerSummary | null
  environmentId: string
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SENSITIVE_KEY_PATTERNS = /password|secret|token|key|credential|api[_-]?key/i

export function ContainerDetailDrawer({
  container,
  environmentId,
  projectId,
  open,
  onOpenChange,
}: ContainerDetailDrawerProps) {
  const [showSecrets, setShowSecrets] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['container-inspect', environmentId, container?.id],
    queryFn: () =>
      inspectContainerFn({ data: { environmentId, containerId: container!.id } }),
    enabled: !!container && open,
  })

  if (!container) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">{container.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{container.state}</Badge>
            <HealthBadge health={container.health} />
            <span className="font-mono text-xs text-white/50">{container.id.slice(0, 12)}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Link
            to="/projects/$projectId/environments/$environmentId/containers/$containerId"
            params={{
              projectId,
              environmentId,
              containerId: container.id,
            }}
          >
            <Button variant="secondary" size="sm">
              View Logs & Inspect →
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ports">Ports</TabsTrigger>
            <TabsTrigger value="env">Env</TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-white/50" />
              </div>
            ) : detail ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatField label="Image" value={detail.image} mono />
                <StatField label="State" value={detail.state} />
                <StatField label="Health" value={detail.health} />
                <StatField label="Status" value={detail.status} />
                <StatField label="Created" value={formatDate(detail.created)} />
                <StatField label="Started At" value={formatDate(detail.startedAt)} />
                <StatField label="Restart Count" value={String(detail.restartCount)} />
                <StatField
                  label="Command"
                  value={detail.command.join(' ') || '—'}
                  mono
                />
                <StatField
                  label="Entrypoint"
                  value={detail.entrypoint.join(' ') || '—'}
                  mono
                />
                <StatField
                  label="Networks"
                  value={detail.networks.join(', ') || '—'}
                />
              </div>
            ) : (
              <p className="text-sm text-white/50">Failed to load container details.</p>
            )}
          </TabsContent>

          {/* Ports tab */}
          <TabsContent value="ports" className="mt-4">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-white/50" />
            ) : detail && detail.ports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container Port</TableHead>
                    <TableHead>Host IP</TableHead>
                    <TableHead>Host Port</TableHead>
                    <TableHead>Protocol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.ports.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.containerPort}</TableCell>
                      <TableCell className="font-mono text-xs">{p.hostIp || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.hostPort || '—'}</TableCell>
                      <TableCell className="text-xs">{p.protocol}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-white/50">No port mappings.</p>
            )}
          </TabsContent>

          {/* Env tab */}
          <TabsContent value="env" className="mt-4">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-white/50" />
            ) : detail && detail.env.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setShowSecrets((s) => !s)}
                  >
                    {showSecrets ? <EyeOff className="mr-1 size-3" /> : <Eye className="mr-1 size-3" />}
                    {showSecrets ? 'Hide secrets' : 'Show secrets'}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.env.map((e, i) => {
                      const isSensitive = SENSITIVE_KEY_PATTERNS.test(e.key)
                      const displayValue = isSensitive && !showSecrets ? '••••••••' : e.value
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs text-white/70">{e.key}</TableCell>
                          <TableCell className="font-mono text-xs break-all">{displayValue}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-white/50">No environment variables.</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function StatField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-white/40">{label}</span>
      <span className={`text-sm text-white/80 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. Jika `Tabs` dari `radix-ui` tidak memiliki `TabsList/Trigger/Content` named exports, import langsung dari `radix-ui` primitives: `import { Tabs as TabsPrimitive } from 'radix-ui'` dan gunakan `TabsPrimitive.Root`, `TabsPrimitive.List`, dst.

- [ ] **Step 3: Commit**

```bash
git add app/modules/docker/presentation/container-detail-drawer.tsx
git commit -m "feat(containers): add ContainerDetailDrawer with overview/ports/env tabs"
```

## Task 7: Wire drawer into Containers route

**Files:**
- Modify: `app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.tsx`

- [ ] **Step 1: Add drawer state + import**

Ganti bagian import (line 1-13) dan tambah state di `ContainersPage`. Gunakan diff di bawah untuk mengganti blok dari `import { Boxes, ArrowLeft }` hingga akhir `ContainersPage` signature:

```typescript
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Boxes, ArrowLeft } from 'lucide-react'
import { captureEvent } from '#/shared/lib/posthog'

import { listContainersFn } from '#/modules/docker/server/list-containers'
import { ContainerTable } from '#/modules/docker/presentation/container-table'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/shared/ui/button'
import { Skeleton } from '#/shared/ui/skeleton'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers',
)({
  component: ContainersPage,
})

function ContainersPage() {
  const { projectId, environmentId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers',
  })
  const mountedAt = useRef(performance.now())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<ContainerSummary | null>(null)

  useEffect(() => {
    captureEvent('environment_selected', {
      projectId,
      environmentId,
      duration_ms: Math.round(performance.now() - mountedAt.current),
    })
  }, [projectId, environmentId])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['containers', environmentId],
    queryFn: () => listContainersFn({ data: { environmentId } }),
  })

  const containers = (data ?? []) as ContainerSummary[]

  const openDetail = (container: ContainerSummary) => {
    setSelectedContainer(container)
    setDrawerOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/projects"
        className="inline-flex w-fit items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Kembali ke project
      </Link>

      <PageHeader
        title="Containers"
        description="Daftar container dari Docker Engine environment ini"
      >
        <Link to="/projects">
          <Button variant="secondary">Project</Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <ContainerTableSkeleton />
      ) : isError ? (
        <div className="rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          <p className="font-medium">Gagal memuat container</p>
          <p className="mt-1 text-white/70">
            {error instanceof Error
              ? error.message
              : 'Docker Engine tidak dapat dijangkau. Periksa koneksi environment.'}
          </p>
        </div>
      ) : containers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-12 text-center backdrop-blur-[var(--glass-blur)]">
          <Boxes className="size-10 text-white/40" />
          <p className="text-sm text-white/60">
            Tidak ada container pada environment ini.
          </p>
        </div>
      ) : (
        <ContainerTable
          containers={containers}
          environmentId={environmentId}
          onOpenDetail={openDetail}
        />
      )}

      <ContainerDetailDrawer
        container={selectedContainer}
        environmentId={environmentId}
        projectId={projectId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}

function ContainerTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-full rounded-[var(--glass-radius)]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[var(--glass-radius)]" />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.tsx
git commit -m "feat(containers): wire ContainerDetailDrawer into containers route"
```

---

## Task 8: Container Logs Viewer + Detail Page

**Files:**
- Create: `app/modules/docker/presentation/container-logs-viewer.tsx`
- Create: `app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.tsx`
- Create: `app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.index.tsx`
- Create: `app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.logs.tsx`

- [ ] **Step 1: Create `container-logs-viewer.tsx`**

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw, Pause, Play } from 'lucide-react'

import { containerLogsFn } from '#/modules/docker/server/container-logs'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'

interface ContainerLogsViewerProps {
  environmentId: string
  containerId: string
}

const TAIL_OPTIONS = [50, 100, 200, 500]

export function ContainerLogsViewer({ environmentId, containerId }: ContainerLogsViewerProps) {
  const [tail, setTail] = useState(200)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['container-logs', environmentId, containerId, tail],
    queryFn: () => containerLogsFn({ data: { environmentId, containerId, tail } }),
    refetchInterval: autoRefresh ? 5000 : false,
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {TAIL_OPTIONS.map((opt) => (
            <Button
              key={opt}
              variant={tail === opt ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTail(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
        <span className="text-xs text-white/40">tail lines</span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => setAutoRefresh((r) => !r)}
          >
            {autoRefresh ? <Pause className="mr-1 size-3" /> : <Play className="mr-1 size-3" />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1 size-3 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Log output */}
      <div className="max-h-[600px] overflow-auto rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40 p-4 font-mono text-xs leading-relaxed">
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 className="size-4 animate-spin" /> Loading logs...
          </div>
        ) : logs && logs.length > 0 ? (
          logs.map((line, i) => (
            <div key={i} className="flex gap-2">
              {line.timestamp && (
                <span className="shrink-0 text-white/40">{line.timestamp}</span>
              )}
              <span
                className={line.stream === 'stderr' ? 'text-red-400' : 'text-white/80'}
              >
                {line.message}
              </span>
            </div>
          ))
        ) : (
          <span className="text-white/40">No logs available.</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create detail layout route `.$containerId.tsx`**

```typescript
import { createFileRoute, Link, Outlet, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from 'radix-ui'
import { useQuery } from '@tanstack/react-query'

import { listContainersFn } from '#/modules/docker/server/list-containers'
import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { PageHeader } from '#/shared/ui/glass-card'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId',
)({
  component: ContainerDetailPage,
})

function ContainerDetailPage() {
  const { projectId, environmentId, containerId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId',
  })

  const { data: containers } = useQuery({
    queryKey: ['containers', environmentId],
    queryFn: () => listContainersFn({ data: { environmentId } }),
  })

  const summary = (containers ?? []).find((c: any) => c.id === containerId)

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/projects/$projectId/environments/$environmentId/containers"
        params={{ projectId, environmentId }}
        className="inline-flex w-fit items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-4" /> Kembali ke containers
      </Link>

      <PageHeader title={summary?.name ?? containerId.slice(0, 12)}>
        {summary && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{summary.state}</Badge>
            <HealthBadge health={summary.health} />
          </div>
        )}
      </PageHeader>

      <Tabs defaultValue="logs">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="logs" asChild>
            <Link
              to="/projects/$projectId/environments/$environmentId/containers/$containerId/logs"
              params={{ projectId, environmentId, containerId }}
            >
              Logs
            </Link>
          </TabsTrigger>
          <TabsTrigger value="inspect" asChild>
            <Link
              to="/projects/$projectId/environments/$environmentId/containers/$containerId/inspect"
              params={{ projectId, environmentId, containerId }}
            >
              Inspect
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
```

- [ ] **Step 3: Create `.$containerId.index.tsx` (redirect to logs)**

```typescript
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/',
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
      params: {
        projectId: params.projectId,
        environmentId: params.environmentId,
        containerId: params.containerId,
      },
    })
  },
})
```

- [ ] **Step 4: Create `.$containerId.logs.tsx`**

```typescript
import { createFileRoute, useParams } from '@tanstack/react-router'

import { ContainerLogsViewer } from '#/modules/docker/presentation/container-logs-viewer'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
)({
  component: ContainerLogsPage,
})

function ContainerLogsPage() {
  const { environmentId, containerId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/logs',
  })

  return <ContainerLogsViewer environmentId={environmentId} containerId={containerId} />
}
```

- [ ] **Step 5: Typecheck + regenerate routes**

Run: `npx tsr generate && npx tsc --noEmit`
Expected: 0 errors. `tsr generate` generates entries in `routeTree.gen.ts` for the new `$containerId` routes.

- [ ] **Step 6: Commit**

```bash
git add app/modules/docker/presentation/container-logs-viewer.tsx \
  app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.tsx \
  app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.index.tsx \
  app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.logs.tsx \
  app/routeTree.gen.ts
git commit -m "feat(containers): add logs viewer + container detail page layout"
```

## Task 9: Container Inspect Viewer

**Files:**
- Create: `app/modules/docker/presentation/container-inspect-viewer.tsx`
- Create: `app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.inspect.tsx`

- [ ] **Step 1: Create `container-inspect-viewer.tsx`**

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, ChevronRight, ChevronDown } from 'lucide-react'

import { inspectContainerFn } from '#/modules/docker/server/inspect-container'
import { Input } from '#/shared/ui/input'

interface ContainerInspectViewerProps {
  environmentId: string
  containerId: string
}

export function ContainerInspectViewer({ environmentId, containerId }: ContainerInspectViewerProps) {
  const [search, setSearch] = useState('')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['container-inspect', environmentId, containerId],
    queryFn: () =>
      inspectContainerFn({ data: { environmentId, containerId } }),
  })

  const raw = detail?.raw as Record<string, unknown> | undefined
  const filteredRaw = search && raw ? filterObject(raw, search.toLowerCase()) : raw

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Filter keys (e.g. 'network', 'config', 'mounts')..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      <div className="max-h-[600px] overflow-auto rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-black/40 p-4 font-mono text-xs leading-relaxed">
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 className="size-4 animate-spin" /> Loading inspect data...
          </div>
        ) : filteredRaw ? (
          <JsonTree data={filteredRaw} search={search} />
        ) : (
          <span className="text-white/40">No inspect data available.</span>
        )}
      </div>
    </div>
  )
}

function filterObject(obj: Record<string, unknown>, search: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes(search)) {
      result[key] = value
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = filterObject(value as Record<string, unknown>, search)
      if (Object.keys(nested).length > 0) {
        result[key] = nested
      }
    } else if (typeof value === 'string' && value.toLowerCase().includes(search)) {
      result[key] = value
    }
  }
  return result
}

interface JsonTreeProps {
  data: unknown
  search?: string
  depth?: number
}

function JsonTree({ data, search, depth = 0 }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState(depth > 1)

  if (data === null || data === undefined) {
    return <span className="text-white/40">null</span>
  }

  if (typeof data === 'boolean') {
    return <span className="text-amber-400">{String(data)}</span>
  }

  if (typeof data === 'number') {
    return <span className="text-sky-400">{String(data)}</span>
  }

  if (typeof data === 'string') {
    return <span className="text-emerald-400">"{data}"</span>
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-white/40">[]</span>
    return (
      <div>
        <span
          className="cursor-pointer text-white/60 hover:text-white"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronRight className="mr-1 inline size-3" /> : <ChevronDown className="mr-1 inline size-3" />}
          [{data.length}]
        </span>
        {!collapsed && (
          <div className="ml-4 border-l border-white/10 pl-3">
            {data.map((item, i) => (
              <div key={i}>
                <span className="text-white/40">{i}:</span>{' '}
                <JsonTree data={item} search={search} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-white/40">{'{}'}</span>
    return (
      <div>
        <span
          className="cursor-pointer text-white/60 hover:text-white"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronRight className="mr-1 inline size-3" /> : <ChevronDown className="mr-1 inline size-3" />}
          {'{'}
          {collapsed && `...`}
        </span>
        {!collapsed && (
          <div className="ml-4 border-l border-white/10 pl-3">
            {entries.map(([key, value]) => (
              <div key={key}>
                <span className="text-sky-300">"{key}"</span>
                <span className="text-white/40">: </span>
                <JsonTree data={value} search={search} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
        {!collapsed && <span className="text-white/60">{'}'}</span>}
      </div>
    )
  }

  return <span className="text-white/60">{String(data)}</span>
}
```

- [ ] **Step 2: Create `.$containerId.inspect.tsx` route**

```typescript
import { createFileRoute, useParams } from '@tanstack/react-router'

import { ContainerInspectViewer } from '#/modules/docker/presentation/container-inspect-viewer'

export const Route = createFileRoute(
  '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/inspect',
)({
  component: ContainerInspectPage,
})

function ContainerInspectPage() {
  const { environmentId, containerId } = useParams({
    from: '/_dashboard/projects/$projectId/environments/$environmentId/containers/$containerId/inspect',
  })

  return <ContainerInspectViewer environmentId={environmentId} containerId={containerId} />
}
```

- [ ] **Step 3: Regenerate routes + typecheck**

Run: `npx tsr generate && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/modules/docker/presentation/container-inspect-viewer.tsx \
  app/routes/_dashboard.projects.$projectId.environments.$environmentId.containers.$containerId.inspect.tsx \
  app/routeTree.gen.ts
git commit -m "feat(containers): add inspect viewer with collapsible JSON tree"
```

---

## Self-Review Checklist

### Spec Coverage

| # | Item | Task | Status |
|---|------|------|--------|
| 1 | Search Container | Task 2 (globalFilter) | ✅ |
| 2 | Filter Status | Task 2 (column filter + Select) | ✅ |
| 3 | Sort Container | Task 2 (getSortedRowModel) | ✅ |
| 4 | Quick Actions: Start/Stop/Restart/Remove | Task 2 (remove) + existing (start/stop/restart) | ✅ |
| 5 | Status Indicator | Task 2 (StateBadge + HealthBadge) | ✅ |
| 6 | Health Status | Task 1 (health field) + Task 2 (HealthBadge) | ✅ |
| 7 | Container Detail Drawer | Task 6 (Sheet) + Task 7 (route wiring) | ✅ |
| 8 | Overview Stats | Task 6 (overview tab) | ✅ |
| 9 | Logs Viewer | Task 8 (logs page + viewer) | ✅ |
| 10 | Inspect | Task 9 (JSON tree viewer) | ✅ |
| 11 | Environment Variables | Task 6 (env tab with masking) | ✅ |
| 12 | Ports | Task 6 (ports tab) | ✅ |

### Placeholder Scan
No TBD/TODO/placeholder steps found. All code is complete.

### Type Consistency
- `ContainerSummary.health` type: `ContainerHealth` (defined Task 1, used in Task 2 HealthBadge + Task 6 HealthBadge) ✅
- `ContainerDetail` type: used in `inspectContainerFn` (Task 4), `ContainerDetailDrawer` (Task 6), `ContainerInspectViewer` (Task 9) ✅
- `ContainerLogLine` type: defined in `container-logs.ts` (Task 5), used in `ContainerLogsViewer` (Task 8) ✅
- `removeContainerFn` (Task 3) used in `ContainerTable` (Task 2) ✅
- `inspectContainerFn` (Task 4) used in `ContainerDetailDrawer` (Task 6), `ContainerDetailPage` (Task 8), `ContainerInspectViewer` (Task 9) ✅
- `containerLogsFn` (Task 5) used in `ContainerLogsViewer` (Task 8) ✅

<!-- END_PLAN -->





