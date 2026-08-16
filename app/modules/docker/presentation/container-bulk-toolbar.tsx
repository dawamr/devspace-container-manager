import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCw, Trash2, Loader2, X, AlertTriangle } from 'lucide-react'
import { startContainerFn } from '#/modules/docker/server/start-container'
import { stopContainerFn } from '#/modules/docker/server/stop-container'
import { restartContainerFn } from '#/modules/docker/server/restart-container'
import { removeContainerFn } from '#/modules/docker/server/remove-container'
import { userFriendlyDockerMessage } from '#/modules/docker/domain/docker-error'
import { Button } from '#/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/shared/ui/dialog'
import { cn } from '#/shared/lib/cn'

interface ContainerBulkToolbarProps {
  selectedIds: string[]
  environmentId: string
  onClear: () => void
  canManage?: boolean
  canDelete?: boolean
}

type BulkAction = 'start' | 'stop' | 'restart' | 'remove'

const ACTION_BTN_CLASS =
  'inline-flex items-center gap-1.5 rounded-[var(--glass-radius)] border border-[var(--glass-border)] ' +
  'bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)] px-3 py-1.5 text-sm text-white/70 ' +
  'hover:text-white hover:bg-white/10 hover:border-[var(--glass-border-strong)] ' +
  'disabled:opacity-30 disabled:pointer-events-none transition-colors'

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('FORBIDDEN')) return 'Tidak punya akses untuk aksi ini.'
  if (message.includes('UNAUTHORIZED')) return 'Sesi tidak valid, silakan login ulang.'
  return userFriendlyDockerMessage(err) || message || 'Aksi gagal. Coba lagi.'
}

export function ContainerBulkToolbar({ selectedIds, environmentId, onClear, canManage = true, canDelete = true }: ContainerBulkToolbarProps) {
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['containers', environmentId] })
  }

  const runBulk = async (action: BulkAction, ids: string[]) => {
    const fnMap = {
      start: startContainerFn,
      stop: stopContainerFn,
      restart: restartContainerFn,
      remove: removeContainerFn,
    } as const
    const fn = fnMap[action]
    await Promise.all(
      ids.map((id) => fn({ data: { environmentId, containerId: id } })),
    )
  }

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: BulkAction; ids: string[] }) =>
      runBulk(action, ids),
    onMutate: ({ action }) => {
      setError(null)
      setPendingAction(action)
    },
    onSuccess: () => {
      invalidate()
      onClear()
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setPendingAction(null),
  })

  const count = selectedIds.length
  const isBusy = bulkMutation.isPending

  const handleAction = (action: BulkAction) => {
    if (action === 'remove') {
      setConfirmRemove(true)
      return
    }
    bulkMutation.mutate({ action, ids: selectedIds })
  }

  return (
    <>
      {error && (
        <div className="flex items-center gap-2 rounded-[var(--glass-radius)] border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 backdrop-blur-[var(--glass-blur)]">
        <span className="text-sm font-medium text-white/80 tabular-nums">
          {count} selected
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className={ACTION_BTN_CLASS}
              disabled={isBusy}
              onClick={() => handleAction('start')}
            >
              {pendingAction === 'start' && isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              <span className="hidden sm:inline">Start</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className={ACTION_BTN_CLASS}
              disabled={isBusy}
              onClick={() => handleAction('stop')}
            >
              {pendingAction === 'stop' && isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Square className="size-4" />
              )}
              <span className="hidden sm:inline">Stop</span>
            </Button>
          )}

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className={ACTION_BTN_CLASS}
              disabled={isBusy}
              onClick={() => handleAction('restart')}
            >
              {pendingAction === 'restart' && isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCw className="size-4" />
              )}
              <span className="hidden sm:inline">Restart</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(ACTION_BTN_CLASS, 'hover:border-red-500/50 hover:text-red-300')}
              disabled={isBusy}
              onClick={() => handleAction('remove')}
            >
              {pendingAction === 'remove' && isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              <span className="hidden sm:inline">Remove</span>
            </Button>
          )}

          <div className="mx-1 h-5 w-px bg-[var(--glass-border)]" />

          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white"
            disabled={isBusy}
            onClick={onClear}
          >
            <X className="size-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Remove confirmation */}
      <Dialog open={confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus {count} container?</DialogTitle>
            <DialogDescription>
              Anda akan menghapus <span className="font-semibold text-white">{count} container</span>.
              Container yang masih running akan di-force remove.
              Aksi ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={bulkMutation.isPending}
              onClick={() => {
                setConfirmRemove(false)
                bulkMutation.mutate({ action: 'remove', ids: selectedIds })
              }}
            >
              {bulkMutation.isPending && pendingAction === 'remove' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Hapus {count}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
