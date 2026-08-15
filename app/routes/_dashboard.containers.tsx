import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Box, Search, Loader2, AlertTriangle, Trash2 } from 'lucide-react'

import { listAllContainersFn, type GlobalContainerSummary } from '#/modules/docker/server/list-all-containers'
import { listEnvironmentsMapFn } from '#/modules/docker/server/list-environments-map'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { ContainerTable } from '#/modules/docker/presentation/container-table'
import { ContainerSummaryBar } from '#/modules/docker/presentation/container-summary-bar'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import { ContainerGridCard } from '#/modules/docker/presentation/container-grid-card'
import { ContainerListRow } from '#/modules/docker/presentation/container-list-row'
import { ContainerViewToggle, type ViewMode } from '#/modules/docker/presentation/container-view-toggle'
import { ContainerGroupControl, type GroupBy } from '#/modules/docker/presentation/container-group-control'
import { ContainerColumnToggle, type ColumnDef } from '#/modules/docker/presentation/container-column-toggle'
import { GlassPanel } from '#/shared/ui/glass-card'
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
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'

export const Route = createFileRoute('/_dashboard/containers')({
  component: ContainersPage,
})

const VIEW_MODE_KEY = 'devspace:containers:view-mode'
const GROUP_BY_KEY = 'devspace:containers:group-by'
const COLUMNS_KEY = 'devspace:containers:columns'

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'environment', label: 'Environment' },
  { key: 'project', label: 'Project' },
  { key: 'state', label: 'State' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
  { key: 'ports', label: 'Ports' },
]

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  name: true,
  environment: true,
  project: true,
  state: true,
  status: true,
  createdAt: true,
  ports: true,
}

interface ContainerGroup {
  key: string
  label: string
  containers: GlobalContainerSummary[]
}

function ContainersPage() {
  const queryClient = useQueryClient()

  // ── State ──────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(DEFAULT_COLUMN_VISIBILITY)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [detailTarget, setDetailTarget] = useState<GlobalContainerSummary | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<GlobalContainerSummary | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Hydrate from localStorage ─────────────────────────
  useEffect(() => {
    const savedView = localStorage.getItem(VIEW_MODE_KEY)
    if (savedView === 'table' || savedView === 'grid' || savedView === 'list') {
      setViewMode(savedView)
    }
    const savedGroup = localStorage.getItem(GROUP_BY_KEY)
    if (savedGroup === 'none' || savedGroup === 'environment' || savedGroup === 'project') {
      setGroupBy(savedGroup)
    }
    const savedColumns = localStorage.getItem(COLUMNS_KEY)
    if (savedColumns) {
      try {
        setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(savedColumns) })
      } catch {
        /* ignore malformed JSON */
      }
    }
  }, [])

  // ── Persist to localStorage ────────────────────────────
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    localStorage.setItem(GROUP_BY_KEY, groupBy)
  }, [groupBy])

  useEffect(() => {
    localStorage.setItem(COLUMNS_KEY, JSON.stringify(columnVisibility))
  }, [columnVisibility])

  // ── Keyboard shortcuts ─────────────────────────────────
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

  // ── Data queries ───────────────────────────────────────
  const {
    data: containers,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['all-containers'],
    queryFn: () => listAllContainersFn(),
  })

  const { data: envMapData } = useQuery({
    queryKey: ['environments-map'],
    queryFn: () => listEnvironmentsMapFn(),
  })

  // ── Environments map for lookups ───────────────────────
  const envMap = useMemo(() => {
    const m = new Map<string, { name: string; projectName: string }>()
    for (const e of envMapData ?? []) {
      m.set(e.environmentId, { name: e.environmentName, projectName: e.projectName })
    }
    return m
  }, [envMapData])

  // ── Filtering (applied before grouping) ───────────────
  const filteredContainers = useMemo(() => {
    let result = containers ?? []

    // Status filter
    if (statusFilter === 'running') {
      result = result.filter((c) => c.state === 'running')
    } else if (statusFilter === 'exited') {
      result = result.filter((c) => c.state === 'exited')
    } else if (statusFilter === 'unhealthy') {
      result = result.filter((c) => c.health === 'unhealthy')
    }

    // Search filter (case-insensitive on name/image/state/status)
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.image.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q),
      )
    }

    return result
  }, [containers, statusFilter, search])

  // ── Grouping ───────────────────────────────────────────
  const groups = useMemo<ContainerGroup[]>(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All', containers: filteredContainers }]
    }

    const m = new Map<string, ContainerGroup>()
    for (const c of filteredContainers) {
      let key: string
      let label: string
      if (groupBy === 'environment') {
        key = c.environmentId
        label = envMap.get(c.environmentId)?.name ?? c.environmentId
      } else {
        key = c.projectId
        label = envMap.get(c.environmentId)?.projectName ?? c.projectId
      }
      const existing = m.get(key)
      if (existing) {
        existing.containers.push(c)
      } else {
        m.set(key, { key, label, containers: [c] })
      }
    }

    return Array.from(m.values())
  }, [filteredContainers, groupBy, envMap])

  // ── Remove mutation ─────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (target: GlobalContainerSummary) =>
      removeContainerFn({
        data: { environmentId: target.environmentId, containerId: target.id },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['all-containers'] })
      setRemoveTarget(null)
    },
  })

  // ── Open detail handler ────────────────────────────────
  const openDetail = (c: ContainerSummary) => {
    setDetailTarget(c as unknown as GlobalContainerSummary)
    setDrawerOpen(true)
  }

  // For ContainerTable in global mode — pass first container's environmentId
  const tableEnvironmentId = filteredContainers[0]?.environmentId ?? ''

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </header>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input
            ref={searchRef}
            placeholder="Search name, image, state…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ContainerGroupControl value={groupBy} onChange={setGroupBy} />
        <ContainerColumnToggle
          columns={COLUMNS}
          visibility={columnVisibility}
          onChange={setColumnVisibility}
        />
        <ContainerViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Summary bar */}
      <ContainerSummaryBar
        containers={filteredContainers as unknown as ContainerSummary[]}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {/* Container views */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Memuat container…
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 px-4 py-8 text-center">
          <AlertTriangle className="size-6 text-red-400" />
          <p className="text-sm text-red-300">Gagal memuat container.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
        </div>
      ) : filteredContainers.length === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
          Belum ada container ter-registrasi
          {search || statusFilter !== 'all'
            ? ' yang cocok dengan filter.'
            : '. Klik Refresh untuk memulai sinkronisasi.'}
        </GlassPanel>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              {/* Group header (sticky) */}
              {groupBy !== 'none' && (
                <div className="sticky top-0 z-10 flex items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 py-2 backdrop-blur-[var(--glass-blur)]">
                  <span className="text-sm font-semibold text-white">{group.label}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums text-white/60">
                    {group.containers.length}
                  </span>
                </div>
              )}

              {/* Table view */}
              {viewMode === 'table' && (
                <ContainerTable
                  containers={group.containers as unknown as ContainerSummary[]}
                  environmentId={group.containers[0]?.environmentId ?? tableEnvironmentId}
                  onOpenDetail={openDetail}
                  onRefresh={() => refetch()}
                  isGlobal
                  environments={envMap}
                />
              )}

              {/* Grid view */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.containers.map((c) => (
                    <ContainerGridCard
                      key={c.id}
                      container={c as unknown as ContainerSummary}
                      environmentId={c.environmentId}
                      environmentName={envMap.get(c.environmentId)?.name}
                      projectName={envMap.get(c.environmentId)?.projectName}
                      onClick={() => openDetail(c as unknown as ContainerSummary)}
                      onRemove={(c) => setRemoveTarget(c as unknown as GlobalContainerSummary)}
                    />
                  ))}
                </div>
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <GlassPanel className="flex flex-col overflow-hidden">
                  {group.containers.map((c) => (
                    <ContainerListRow
                      key={c.id}
                      container={c as unknown as ContainerSummary}
                      environmentId={c.environmentId}
                      environmentName={envMap.get(c.environmentId)?.name}
                      projectName={envMap.get(c.environmentId)?.projectName}
                      onClick={() => openDetail(c as unknown as ContainerSummary)}
                      onRemove={(c) => setRemoveTarget(c as unknown as GlobalContainerSummary)}
                    />
                  ))}
                </GlassPanel>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <ContainerDetailDrawer
        environmentId={detailTarget?.environmentId ?? ''}
        container={detailTarget as unknown as ContainerSummary | null}
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
              {removeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
