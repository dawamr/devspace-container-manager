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

interface ContainerListRowProps {
  container: ContainerSummary
  environmentId: string
  environmentName?: string
  projectName?: string
  onClick: () => void
  onRemove?: (container: ContainerSummary) => void
}

const ACTION_BTN_CLASS =
  'inline-flex items-center justify-center rounded-[var(--glass-radius)] border border-[var(--glass-border)] ' +
  'bg-[var(--glass-surface)] p-1 text-white/70 hover:text-white hover:bg-white/10 ' +
  'hover:border-[var(--glass-border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-colors'

const STATE_DOT: Record<string, string> = {
  running: 'bg-emerald-400',
  exited: 'bg-white/40',
  paused: 'bg-amber-400',
  restarting: 'bg-amber-400',
  dead: 'bg-red-400',
}

export function ContainerListRow({
  container,
  environmentId,
  environmentName,
  projectName,
  onClick,
  onRemove,
}: ContainerListRowProps) {
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
      className="flex cursor-pointer items-center gap-3 border-b border-[var(--glass-border)] px-3 py-2 text-xs transition-colors hover:bg-white/5"
      onClick={onClick}
    >
      <span className={cn('size-2 shrink-0 rounded-full', STATE_DOT[container.state] ?? 'bg-white/40')} />
      <span className="shrink-0 font-medium text-white">{container.name}</span>
      <span className="hidden truncate font-mono text-white/40 md:inline">{container.image}</span>
      <span className="hidden shrink-0 capitalize text-white/60 lg:inline">{container.state}</span>
      {container.ports && container.ports.length > 0 && (
        <div className="hidden shrink-0 gap-1 lg:flex">
          {container.ports.slice(0, 3).map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[10px]">
              {p}
            </Badge>
          ))}
        </div>
      )}
      {environmentName && (
        <span className="ml-auto hidden shrink-0 text-white/40 lg:inline">
          {projectName ? `${projectName}/${environmentName}` : environmentName}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <Loader2 className="size-3.5 animate-spin text-white/50" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Start" disabled={!canStart || locked} onClick={() => startMutation.mutate(container.id)}>
              <Play className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Stop" disabled={!canStop || locked} onClick={() => stopMutation.mutate(container.id)}>
              <Square className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={ACTION_BTN_CLASS} title="Restart" disabled={!canRestart || locked} onClick={() => restartMutation.mutate(container.id)}>
              <RotateCw className="size-3" />
            </Button>
            <Button variant="ghost" size="icon" className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')} title="Remove" disabled={locked} onClick={() => onRemove?.(container)}>
              <Trash2 className="size-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
