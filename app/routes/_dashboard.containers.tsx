import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Box, Plus } from 'lucide-react'

import { listAllContainersFn, type GlobalContainerSummary } from '#/modules/docker/server/list-all-containers'
import { GlassPanel } from '#/shared/ui/glass-card'
import { Button } from '#/shared/ui/button'
import { Badge } from '#/shared/ui/badge'

export const Route = createFileRoute('/_dashboard/containers')({
  component: ContainersPage,
})

function ContainersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['all-containers'],
    queryFn: () => listAllContainersFn(),
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Box className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Containers</h1>
            <p className="text-sm text-muted-foreground">
              Semua container lintas project & environment
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
        <p className="text-sm text-muted-foreground">Memuat container…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Gagal memuat container.</p>
      ) : (data?.length ?? 0) === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
          Belum ada container ter-registrasi. Klik Refresh untuk memulai sinkronisasi.
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data ?? []).map((container) => (
            <ContainerCard key={container.id} container={container} />
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  stopped: 'bg-white/40',
}

function ContainerCard({ container }: { container: GlobalContainerSummary }) {
  const dotColor = STATUS_DOT[container.state] ?? STATUS_DOT.stopped
  const stateLabel = container.state === 'running' ? 'Running' : 'Stopped'

  return (
    <Link
      to="/containers/$containerId"
      params={{ containerId: container.containerId }}
      className="group flex flex-col gap-4 rounded-[var(--glass-radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-5 backdrop-blur-[var(--glass-blur-sm)] transition-colors hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {/* Image / Icon area */}
      <div className="flex size-16 items-center justify-center rounded-xl bg-white/10 text-white/60">
        <Box className="size-8" />
      </div>

      {/* Name + status */}
      <div className="flex flex-col gap-1">
        <h3 className="truncate text-sm font-semibold text-foreground">{container.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${dotColor}`} />
          <span className="text-xs text-muted-foreground">{stateLabel}</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">{container.image}</span>
        {container.stackName && (
          <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
            {container.stackName}
          </Badge>
        )}
      </div>
    </Link>
  )
}
