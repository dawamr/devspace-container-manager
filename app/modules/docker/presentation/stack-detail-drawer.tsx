import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Container, Play, Square, RotateCw, Loader2 } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/shared/ui/sheet'
import { cn } from '#/shared/lib/cn'
import { HealthBadge } from '#/modules/docker/presentation/container-health-badge'
import { ContainerDetailDrawer } from '#/modules/docker/presentation/container-detail-drawer'
import { getStackDetailFn, type StackContainerSummary } from '#/modules/docker/server/get-stack-detail'
import { stackBulkActionFn } from '#/modules/docker/server/stack-bulk-action'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'

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
              {detail?.type === 'custom' && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: detail.color ? `${detail.color}20` : 'rgba(255,255,255,0.1)',
                    color: detail.color ?? 'rgba(255,255,255,0.6)',
                  }}
                >
                  Custom
                </span>
              )}
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

              {/* Container list */}
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-white/70">Containers</h3>
                {detail.containers.length === 0 ? (
                  <div className="flex flex-col gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-white/5 p-4">
                    <p className="text-sm text-white/60">Tidak ada container dalam stack ini.</p>
                    <p className="text-xs text-white/40">
                      Container otomatis terdeteksi dari Docker Compose label
                      <code className="mx-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">com.docker.compose.project</code>
                      yang cocok dengan nama stack.
                    </p>
                  </div>
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
          } satisfies ContainerSummary}
          open={containerDrawerOpen}
          onOpenChange={setContainerDrawerOpen}
        />
      )}
    </>
  )
}
