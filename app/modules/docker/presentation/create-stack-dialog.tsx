import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/shared/ui/dialog'
import { Button } from '#/shared/ui/button'
import { createCustomStackFn } from '#/modules/docker/server/manage-stack'
import { listEnvironmentsMapFn } from '#/modules/docker/server/list-environments-map'
import { cn } from '#/shared/lib/cn'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#ef4444',
]

export function CreateStackDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [environmentId, setEnvironmentId] = useState('')
  const queryClient = useQueryClient()

  const { data: envMap } = useQuery({
    queryKey: ['environments-map'],
    queryFn: () => listEnvironmentsMapFn(),
  })

  const mutation = useMutation({
    mutationFn: () =>
      createCustomStackFn({
        data: {
          name,
          description: description || undefined,
          color,
          environmentId,
          projectId: envMap?.find((e) => e.environmentId === environmentId)?.projectId ?? '',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stacks'] })
      setOpen(false)
      setName('')
      setDescription('')
      setColor(PRESET_COLORS[0])
      setEnvironmentId('')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New Stack
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-[var(--glass-blur)]">
        <DialogHeader>
          <DialogTitle>Create Custom Stack</DialogTitle>
          <DialogDescription>
            Buat grouping visual custom untuk mengelompokkan container.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stack-name" className="text-xs font-medium uppercase tracking-wide text-white/40">Name</label>
            <input
              id="stack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. monitoring-stack"
              className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur-[var(--glass-blur)] focus:border-[var(--glass-border-strong)] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="stack-desc" className="text-xs font-medium uppercase tracking-wide text-white/40">Description (optional)</label>
            <input
              id="stack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Prometheus + Grafana + Alertmanager"
              className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur-[var(--glass-blur)] focus:border-[var(--glass-border-strong)] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="stack-env" className="text-xs font-medium uppercase tracking-wide text-white/40">Environment</label>
            <select
              id="stack-env"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="rounded-[var(--glass-radius)] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2 text-sm text-white backdrop-blur-[var(--glass-blur)]"
            >
              <option value="">Select environment…</option>
              {envMap?.map((e) => (
                <option key={e.environmentId} value={e.environmentId}>
                  {e.projectName} / {e.environmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-white/40">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-transform',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !environmentId || mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Stack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
