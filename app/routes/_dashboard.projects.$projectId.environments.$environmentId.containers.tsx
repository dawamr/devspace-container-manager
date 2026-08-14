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

  // Sprint 2 / H1: time from route entry to environment selection.
  const mountedAt = useRef(performance.now())

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
  const [detailTarget, setDetailTarget] = useState<ContainerSummary | null>(null)

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
          onOpenDetail={setDetailTarget}
        />
      )}

      <ContainerDetailDrawer
        environmentId={environmentId}
        container={detailTarget}
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null)
        }}
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
