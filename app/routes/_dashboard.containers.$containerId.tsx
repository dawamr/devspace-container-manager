import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Box } from 'lucide-react'

import { inspectContainerByIdFn } from '#/modules/docker/server/inspect-container-by-id'
import { GlassPanel } from '#/shared/ui/glass-card'
import { Badge } from '#/shared/ui/badge'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/containers/$containerId')({
  component: ContainerDetailPage,
})

function ContainerDetailPage() {
  const { containerId } = Route.useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['container-detail', containerId],
    queryFn: () => inspectContainerByIdFn({ data: { containerId } }),
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          to="/containers"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white/10"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Box className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {data?.name ?? containerId.slice(0, 12)}
          </h1>
          <p className="text-sm text-muted-foreground">Container detail</p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat detail container…</p>
      ) : isError ? (
        <GlassPanel className="p-6 text-sm text-destructive">
          Container tidak ditemukan atau tidak dapat diakses.
        </GlassPanel>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GlassPanel className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              General
            </h2>
            <DetailGrid
              items={[
                ['ID', data.id.slice(0, 12)],
                ['Name', data.name],
                ['Image', data.image],
                ['State', data.state],
                ['Status', data.status],
                ['Created', data.createdAt],
              ]}
            />
          </GlassPanel>

          <GlassPanel className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ports
            </h2>
            {data.portMappings.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.portMappings.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{p.protocol}</Badge>
                    <span className="font-mono text-xs">
                      {p.hostIp ?? '0.0.0.0'}:{p.hostPort ?? '-'} → {p.containerPort}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No port mappings</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </h2>
            {Object.keys(data.labels).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.labels).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="font-mono text-xs">
                    {k}={v}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No labels</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mounts
            </h2>
            {data.mounts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {data.mounts.map((m, i) => (
                  <div key={i} className="font-mono text-xs text-muted-foreground">
                    {m.source} → {m.destination} ({m.readOnly ? 'ro' : 'rw'})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No mounts</p>
            )}
          </GlassPanel>
        </div>
      ) : null}
    </div>
  )
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </dt>
          <dd className="text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
