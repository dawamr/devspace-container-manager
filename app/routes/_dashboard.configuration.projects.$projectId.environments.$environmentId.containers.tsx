import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Boxes, ArrowLeft, RotateCw } from 'lucide-react'
import { captureEvent } from '#/shared/lib/posthog'

import { listContainersFn } from '#/modules/docker/server/list-containers'
import { ContainerTable } from '#/modules/docker/presentation/container-table'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import { checkPermissionFn } from '#/modules/rbac/server/check-permission'
import { RESOURCES, ACTIONS } from '#/modules/rbac/domain/constants'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/shared/ui/button'
import { PageHeader } from '#/shared/ui/glass-card'

export const Route = createFileRoute(
  '/_dashboard/configuration/projects/$projectId/environments/$environmentId/containers',
)({
  component: ContainersPage,
})

function ContainersPage() {
  const { projectId, environmentId } = useParams({
    from: '/_dashboard/configuration/projects/$projectId/environments/$environmentId/containers',
  })
  const { user } = Route.useRouteContext()

  // Permission checks
  const { data: canManage = false } = useQuery({
    queryKey: ['permission', user.roleName, 'containers', 'update'],
    queryFn: () => checkPermissionFn({ data: { roleName: user.roleName, resource: RESOURCES.CONTAINERS, action: ACTIONS.UPDATE } }),
  })
  const { data: canDelete = false } = useQuery({
    queryKey: ['permission', user.roleName, 'containers', 'delete'],
    queryFn: () => checkPermissionFn({ data: { roleName: user.roleName, resource: RESOURCES.CONTAINERS, action: ACTIONS.DELETE } }),
  })
  const { data: canAssign = false } = useQuery({
    queryKey: ['permission', user.roleName, 'containers', 'assign'],
    queryFn: () => checkPermissionFn({ data: { roleName: user.roleName, resource: RESOURCES.CONTAINERS, action: ACTIONS.ASSIGN } }),
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

  const { data, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['containers', environmentId],
    queryFn: () => listContainersFn({ data: { environmentId } }),
    refetchInterval: 30_000,
  })

  const containers = (data ?? []) as ContainerSummary[]
  const [detailTarget, setDetailTarget] = useState<ContainerSummary | null>(null)

  // Freshness indicator: tick every 1s to show "Updated Xs ago".
  const [, forceTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1_000)
    return () => clearInterval(t)
  }, [])
  const secondsAgo = dataUpdatedAt ? Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000)) : null

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/configuration/projects"
        className="inline-flex w-fit items-center gap-1 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Kembali ke project
      </Link>

      <PageHeader
        title="Containers"
        description="Daftar container dari Docker Engine environment ini"
      >
        <div className="flex items-center gap-3">
          {secondsAgo !== null && (
            <span className="text-xs text-white/40 tabular-nums" title="Auto-refresh tiap 30 detik">
              Updated {secondsAgo}s ago
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            title="Refresh (r)"
            className="text-white/60 hover:text-white"
          >
            <RotateCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Link to="/configuration/projects">
            <Button variant="secondary">Project</Button>
          </Link>
        </div>
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
          onRefresh={() => void refetch()}
          canManage={canManage}
          canDelete={canDelete}
          canAssign={canAssign}
          currentUserId={user.id}
        />
      )}

      <ContainerDetailDrawer
        environmentId={environmentId}
        container={detailTarget}
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null)
        }}
        canAssign={canAssign}
      />
    </div>
  )
}

function ContainerTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Summary pills skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)]"
          />
        ))}
      </div>
      {/* Table rows skeleton */}
      <div className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--glass-border)] px-4 py-3 last:border-0"
          >
            <div className="size-4 animate-pulse rounded-[4px] bg-white/10" />
            <div className="h-4 flex-1 animate-pulse rounded bg-white/10" style={{ maxWidth: `${60 - i * 5}%` }} />
            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
