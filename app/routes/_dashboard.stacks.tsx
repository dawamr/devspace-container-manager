import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Layers, Search } from 'lucide-react'
import { CreateStackDialog } from '#/modules/docker/presentation/create-stack-dialog'

import { listAllStacksFn, type GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import { listEnvironmentsMapFn, type EnvironmentMapEntry } from '#/modules/docker/server/list-environments-map'
import { StackViewToggle, type StackViewMode } from '#/modules/docker/presentation/stack-view-toggle'
import { StackGroupControl, type StackGroupBy } from '#/modules/docker/presentation/stack-group-control'
import { StackGridCard } from '#/modules/docker/presentation/stack-grid-card'
import { StackTable } from '#/modules/docker/presentation/stack-table'
import { StackListRow } from '#/modules/docker/presentation/stack-list-row'
import { StackDetailDrawer } from '#/modules/docker/presentation/stack-detail-drawer'
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
  const [selectedStackId, setSelectedStackId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleStackClick = (stack: GlobalStackSummary) => {
    setSelectedStackId(stack.id)
    setDrawerOpen(true)
  }

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
          <CreateStackDialog />
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
                      onClick={() => handleStackClick(stack)}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <StackTable
                  stacks={group.stacks}
                  environmentMap={environmentMap}
                  onRowClick={handleStackClick}
                />
              )}

              {viewMode === 'list' && (
                <div className="flex flex-col gap-2">
                  {group.stacks.map((stack) => (
                    <StackListRow
                      key={stack.id}
                      stack={stack}
                      environmentMap={environmentMap}
                      onClick={() => handleStackClick(stack)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <StackDetailDrawer
        stackId={selectedStackId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
