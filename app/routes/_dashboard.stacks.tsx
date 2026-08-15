import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Layers, Plus } from 'lucide-react'

import { listAllStacksFn, type GlobalStackSummary } from '#/modules/docker/server/list-all-stacks'
import { GlassPanel } from '#/shared/ui/glass-card'
import { Button } from '#/shared/ui/button'

export const Route = createFileRoute('/_dashboard/stacks')({
  component: StacksPage,
})

function StacksPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['all-stacks'],
    queryFn: () => listAllStacksFn(),
  })

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
              Docker Compose stacks lintas project & environment
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat stacks…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Gagal memuat stacks.</p>
      ) : (data?.length ?? 0) === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
          Belum ada stack ter-registrasi. Klik Refresh untuk memulai sinkronisasi.
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data ?? []).map((stack) => (
            <StackCard key={stack.id} stack={stack} />
          ))}
        </div>
      )}
    </div>
  )
}

function StackCard({ stack }: { stack: GlobalStackSummary }) {
  const isActive = stack.isActive
  const dotColor = isActive ? 'bg-emerald-400' : 'bg-white/40'
  const stateLabel = isActive ? 'Running' : 'Partial'

  return (
    <GlassPanel className="flex flex-col gap-4 p-5 backdrop-blur-[var(--glass-blur-sm)] transition-colors hover:bg-[var(--glass-surface-strong)] focus-within:ring-2 focus-within:ring-white/60">
      {/* Image / Icon area */}
      <div className="flex size-16 items-center justify-center rounded-xl bg-white/10 text-white/60">
        <Layers className="size-8" />
      </div>

      {/* Name + status */}
      <div className="flex flex-col gap-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{stack.name}</h3>
        <p className="text-xs text-muted-foreground">
          {stack.containerCount} services
        </p>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dotColor}`} />
          <span className="text-xs text-muted-foreground">{stateLabel}</span>
        </div>
        <span className="mt-1 font-mono text-[10px] text-muted-foreground">
          {stack.environmentId.slice(0, 8)}
        </span>
      </div>
    </GlassPanel>
  )
}
