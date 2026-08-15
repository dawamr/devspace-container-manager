import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCw, Trash2, Loader2 } from 'lucide-react'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { Badge } from '#/shared/ui/badge'
import { Button } from '#/shared/ui/button'
import { cn } from '#/shared/lib/cn'
import type { ContainerSummary } from '#/modules/docker/domain/docker-types'
import { HealthBadge } from './container-health-badge'

interface ContainerGridCardProps {
  container: ContainerSummary
  environmentId: string
  environmentName?: string
  projectName?: string
  onClick: () => void
  onRemove?: (container: ContainerSummary) => void
}

const ACTION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-[var(--glass-radius)] border border-[var(--glass-border)] ' +
  'bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] p-1.5 text-white/70 ' +
  'hover:text-white hover:bg-white/10 hover:border-[var(--glass-border-strong)] ' +
  'disabled:opacity-30 disabled:pointer-events-none transition-colors'

const STATE_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  exited: 'bg-white/40',
  paused: 'bg-amber-400',
  restarting: 'bg-amber-400',
  dead: 'bg-red-400',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ContainerGridCard({
  container,
  environmentId,
  environmentName,
  projectName,
  onClick,
  onRemove,
}: ContainerGridCardProps) {
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['all-containers'] })
  }

  const startMutation = useMutation({
    mutationFn: (containerId: string) => startContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`start-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const stopMutation = useMutation({
    mutationFn: (containerId: string) => stopContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`stop-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const restartMutation = useMutation({
    mutationFn: (containerId: string) => restartContainerFn({ data: { environmentId, containerId } }),
    onMutate: (id) => setPendingAction(`restart-${id}`),
    onSuccess: invalidate,
    onSettled: () => setPendingAction(null),
  })

  const canStart = container.state === 'exited' || container.state === 'paused'
  const canStop = container.state === 'running' || container.state === 'paused'
  const canRestart = container.state === 'running'
  const locked = container.state === 'restarting' || container.state === 'dead'
  const isBusy = pendingAction !== null

  return (
    <div
      className="flex cursor-pointer flex-col gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] p-3 backdrop-blur-[var(--glass-blur)] transition-colors hover:border-[var(--glass-border-strong)]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', STATE_DOT[container.state] ?? 'bg-white/40')} />
          <span className="text-sm font-semibold text-white">{container.name}</span>
        </div>
        <HealthBadge health={container.health} />
      </div>

      <div className="truncate font-mono text-xs text-white/50">{container.image}</div>

      {(environmentName || projectName) && (
        <div className="text-[11px] text-white/40">
          {environmentName && <span>env: {environmentName}</span>}
          {environmentName && projectName && <span> · </span>}
          {projectName && <span>proj: {projectName}</span>}
        </div>
      )}

      {container.ports && container.ports.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {container.ports.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      )}

      <div className="text-[11px] text-white/40">Created: {formatDate(container.createdAt)}</div>

      <div className="flex items-center gap-1 border-t border-[var(--glass-border)] pt-2" onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <Loader2 className="size-4 animate-spin text-white/50" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Start" disabled={!canStart || locked} onClick={() => startMutation.mutate(container.id)}>
              <Play className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Stop" disabled={!canStop || locked} onClick={() => stopMutation.mutate(container.id)}>
              <Square className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Restart" disabled={!canRestart || locked} onClick={() => restartMutation.mutate(container.id)}>
              <RotateCw className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')} title="Remove" disabled={locked} onClick={() => onRemove?.(container)}>
              <Trash2 className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
